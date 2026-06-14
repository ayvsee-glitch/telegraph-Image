import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', 
  'Content-Type': 'application/json'
};

export const runtime = 'edge';

export async function POST(request) {
  const { env, cf, ctx } = getRequestContext();
  let safePage = 0;

  try {
    const body = await request.json().catch(() => ({}));
    const { page, query } = body;

    if (page !== undefined && page !== null) {
      safePage = parseInt(page, 10);
    }
    if (isNaN(safePage) || safePage < 0) {
      safePage = 0;
    }

    const offset = safePage * 10;

    // 💡 核心设计：日志接口不再返回真实的图片路径和预览，而是直接格式化为纯文本
    if (query) {
      // 日志页面的搜索：根据关键词过滤
      const ps = env.IMG.prepare(`SELECT * FROM imginfo WHERE url LIKE ? OR ip LIKE ? ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, `%${query}%`, offset).all();
      
      const textLogs = results.map(item => ({
        ...item,
        // 🌟 强行截断图片特征，组合成一段纯文字的事件记录，让前端只能老老实实当文本渲染
        name: `[事件] 槽位 #${item.id} 成功接收到客户端上传请求`,
        preview: '📝 TEXT_LOG', // 用这串字符破坏 URL 格式，从而不渲染图片
        referer: item.referer ? `🌐 来源: ${item.referer}` : '直接访问 / 工具链上传'
      }));

      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ? OR ip LIKE ?`).bind(`%${query}%`, `%${query}%`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200, "success": true, "message": "success", "data": textLogs, "page": safePage, "total": total
      }, { headers: corsHeaders });

    } else {
      // 日志页面的日常默认状态：把前 10 条数据直接转写为行为日志
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      const textLogs = results.map(item => ({
        ...item,
        name: `[事件] 槽位 #${item.id} 成功接收到客户端上传请求`,
        preview: '📝 TEXT_LOG', 
        referer: item.referer ? `🌐 来源: ${item.referer}` : '直接访问 / 工具链上传'
      }));

      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200, "success": true, "message": "success", "data": textLogs, "page": safePage, "total": total
      }, { headers: corsHeaders });
    }

  } catch (error) {
    return Response.json({
      "code": 500, "success": false, "message": error.message, "data": safePage,
    }, { status: 500, headers: corsHeaders });
  }
}
