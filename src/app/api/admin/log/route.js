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
      
      // 🌟 终极剔除：直接移除 name 和 preview 字段，并优化 referer 显示
      const cleanResults = results.map(item => ({
        id: item.id,
        time: item.time,
        ip: item.ip,
        rating: item.rating,
        total: item.total,
        referer: item.referer ? `🌐 来自: ${item.referer}` : '直接访问 / 脚本上传'
        // 彻底不给前端返回 name 和 preview 字段
      }));
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?`).bind(`%${query}%`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": cleanResults,
        "page": safePage,
        "total": total
      }, { headers: corsHeaders });

    } else {
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      // 🌟 终极剔除：直接移除 name 和 preview 字段，并优化 referer 显示
      const cleanResults = results.map(item => ({
        id: item.id,
        time: item.time,
        ip: item.ip,
        rating: item.rating,
        total: item.total,
        referer: item.referer ? `🌐 来自: ${item.referer}` : '直接访问 / 脚本上传'
        // 彻底不给前端返回 name 和 preview 字段
      }));
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": cleanResults,
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
