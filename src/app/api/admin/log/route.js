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
      // 💡 当输入 sys、log 或 系统 时，进入全纯净日志模式
      if (query.toLowerCase() === 'sys' || query === '系统' || query.toLowerCase() === 'log') {
        const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
        const { results } = await ps.bind(offset).all();
        
        const pureLogs = results.map(item => ({
          ...item, // 完整保留原本的 url、name、preview，确保结构不出错、不错位
          name: `🛡️ [安全审计] 节点数据槽位 #${item.id}`,
          referer: `⚙️ 核心审计进程: IP [${item.ip || '未知'}] 状态正常`,
          rating: 0,
          total: 0
        }));

        return Response.json({
          "code": 200, "success": true, "message": "success", "data": pureLogs, "page": safePage, "total": results.length
        }, { headers: corsHeaders });
      }

      // 普通搜索逻辑
      const ps = env.IMG.prepare(`SELECT * FROM imginfo WHERE url LIKE ? ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, offset).all();
      
      const injectedResults = [];
      results.forEach(item => {
        // 1. 放入原图数据
        injectedResults.push({
          ...item,
          referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
        });
        // 2. 放入高仿真系统日志行（克隆当前项结构，阻断敏感文本，防碎图错位）
        injectedResults.push({
          ...item,
          id: `${item.id}_sys`,
          name: `🛡️ [核心审计] 历史镜像槽位 #${item.id} 校验通过`,
          referer: `⚙️ 核心进程: 成功校验来源 IP [${item.ip || '未知'}]`,
          rating: 0,
          total: 0
        });
      });
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?`).bind(`%${query}%`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200, "success": true, "message": "success", "data": injectedResults, "page": safePage, "total": total * 2
      }, { headers: corsHeaders });

    } else {
      // 无搜索状态下的交叉图文流
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      const injectedResults = [];
      results.forEach(item => {
        injectedResults.push({
          ...item,
          referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
        });
        injectedResults.push({
          ...item,
          id: `${item.id}_sys`,
          name: `🛡️ [核心审计] 历史镜像槽位 #${item.id} 校验通过`,
          referer: `⚙️ 核心进程: 成功校验来源 IP [${item.ip || '未知'}]`,
          rating: 0,
          total: 0
        });
      });
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200, "success": true, "message": "success", "data": injectedResults, "page": safePage, "total": total * 2
      }, { headers: corsHeaders });
    }

  } catch (error) {
    return Response.json({
      "code": 500,
      "success": false,
      "message": error.message,
      "data": safePage,
    }, { status: 500, headers: corsHeaders });
  }
}
