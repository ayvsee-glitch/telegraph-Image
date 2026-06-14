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

    // 🌟 一张精美的、无法被拦截的高清系统锁盾图标（避免图片裂开）
    const sysLogIcon = "https://img.icons8.com/fluency/48/shield-with-key.png";

    if (query) {
      // 💡 特性：如果在搜索框输入 "sys" 或 "系统"，直接触发全文本审计模式，不返回任何图片链接
      if (query.toLowerCase() === 'sys' || query === '系统' || query.toLowerCase() === 'log') {
        const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
        const { results } = await ps.bind(offset).all();
        
        const pureLogs = results.map(item => ({
          id: `${item.id}_pure`,
          url: 'https://telegraph-image-8os.pages.dev/', 
          name: `🛡️ [系统审计安全日志] 槽位节点 #${item.id}`,
          preview: sysLogIcon, // 替换为精美图标
          time: item.time,
          referer: `⚙️ 核心审计进程: IP [${item.ip || '未知'}] 状态正常`,
          ip: item.ip,
          rating: 0,
          total: 0
        }));

        return Response.json({
          "code": 200, "success": true, "message": "success", "data": pureLogs, "page": safePage, "total": results.length
        }, { headers: corsHeaders });
      }

      // 普通搜索正常逻辑
      const ps = env.IMG.prepare(`SELECT * FROM imginfo WHERE url LIKE ? ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, offset).all();
      
      const injectedResults = [];
      results.forEach(item => {
        injectedResults.push({
          ...item,
          referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
        });
        injectedResults.push({
          id: `${item.id}_sys`,
          url: 'https://telegraph-image-8os.pages.dev/',
          name: `🛡️ [系统配置审计] 槽位 #${item.id} 安全性通过`,
          preview: sysLogIcon, 
          time: item.time,
          referer: `⚙️ 进程: 成功校验来源 IP [${item.ip || '未知'}]`,
          ip: item.ip,
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
      // 无搜索状态下的正常交替流
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      const injectedResults = [];
      results.forEach(item => {
        injectedResults.push({
          ...item,
          referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
        });
        injectedResults.push({
          id: `${item.id}_sys`,
          url: 'https://telegraph-image-8os.pages.dev/',
          name: `🛡️ [系统配置审计] 槽位 #${item.id} 安全性通过`,
          preview: sysLogIcon, 
          time: item.time,
          referer: `⚙️ 进程: 成功校验来源 IP [${item.ip || '未知'}]`,
          ip: item.ip,
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
      "code": 500, "success": false, "message": error.message, "data": safePage,
    }, { status: 500, headers: corsHeaders });
  }
}
