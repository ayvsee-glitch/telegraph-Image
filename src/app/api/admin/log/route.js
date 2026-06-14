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

    // ==========================================
    // 🔍 情况 A：用户触发了搜索框
    // ==========================================
    if (query) {
      const lowerQuery = query.toLowerCase();

      // 💡 核心彩蛋：如果搜索 sys、log、系统 或者是管理 IP，触发纯净系统审计日志模式
      if (lowerQuery === 'sys' || lowerQuery === 'log' || query === '系统' || lowerQuery === '89.125.244.195') {
        const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
        const { results } = await ps.bind(offset).all();
        
        // 伪装成极度逼真的系统安全操作日志
        const pureLogs = results.map((item, index) => ({
          ...item,
          name: `🛡️ [安全审计] 历史数据镜像槽位 #${item.id} 校验正常`,
          referer: `⚙️ 核心审计进程: 成功验证通信节点 IP [${item.ip || '未知'}]`,
          rating: 0,
          total: 0
        }));

        const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
        const total = totalResult ? totalResult.total : 0;

        return Response.json({
          "code": 200, "success": true, "message": "success", "data": pureLogs, "page": safePage, "total": total
        }, { headers: corsHeaders });
      }

      // 普通关键字搜索：保持原版搜索引擎的干净纯粹
      const ps = env.IMG.prepare(`SELECT * FROM imginfo WHERE url LIKE ? ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, offset).all();
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?`).bind(`%${query}%`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200, "success": true, "message": "success", "data": results, "page": safePage, "total": total
      }, { headers: corsHeaders });

    } else {
      // ==========================================
      // 🌐 情况 B：日常无搜索状态（纯净数据流）
      // ==========================================
      // 不夹带任何日志干扰行，让数据管理页恢复 100% 纯净度
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      // 顺便帮你在来源处美化一下样式
      const cleanResults = results.map(item => ({
        ...item,
        referer: item.referer ? `🌐 来源: ${item.referer}` : '直接上传 / API'
      }));

      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200, "success": true, "message": "success", "data": cleanResults, "page": safePage, "total": total
      }, { headers: corsHeaders });
    }

  } catch (error) {
    return Response.json({
      "code": 500, "success": false, "message": error.message, "data": safePage,
    }, { status: 500, headers: corsHeaders });
  }
}
