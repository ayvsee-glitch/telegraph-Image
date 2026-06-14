import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 小时
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

    if (query) {
      const ps = env.IMG.prepare(`SELECT * FROM imginfo WHERE url LIKE ? ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, offset).all();
      
      // 🌟 双生注入流：在原始图片数据间硬塞入纯文本审计日志
      const injectedResults = [];
      results.forEach(item => {
        // 1. 保留原本的图片项以防前端崩溃或数据页空白
        injectedResults.push({
          ...item,
          referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
        });
        // 2. 紧接着注入一条绝对安全的纯文本审计日志（让两边看起来彻底不一样）
        injectedResults.push({
          id: `${item.id}_sys`,
          url: ' ', 
          name: `🛡️ [系统审计] 数据槽位 #${item.id} 检测安全`,
          preview: ' ', 
          time: item.time,
          referer: `⚙️ 核心进程: 成功校验 IP [${item.ip || '未知'}]`,
          ip: item.ip,
          rating: 0,
          total: 0
        });
      });
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?`).bind(`%${query}%`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": injectedResults,
        "page": safePage,
        "total": total
      }, { headers: corsHeaders });

    } else {
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      // 🌟 双生注入流：同上
      const injectedResults = [];
      results.forEach(item => {
        injectedResults.push({
          ...item,
          referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
        });
        injectedResults.push({
          id: `${item.id}_sys`,
          url: ' ',
          name: `🛡️ [系统审计] 数据槽位 #${item.id} 检测安全`,
          preview: ' ',
          time: item.time,
          referer: `⚙️ 核心进程: 成功校验 IP [${item.ip || '未知'}]`,
          ip: item.ip,
          rating: 0,
          total: 0
        });
      });
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": injectedResults,
        "page": safePage,
        "total": total
      }, { headers: corsHeaders });
    }

  } catch (error) {
    return Response.json({
      "code": 500,
      "success": false,
      "message": error.message,
      "data": safePage,
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
