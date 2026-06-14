import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export const runtime = 'edge';

export async function POST(request) {
  // 获取客户端的上下文信息
  const { env, cf, ctx } = getRequestContext();
  
  // 先在外面声明一个 page 的兜底变量，防止 catch 块里找不到它
  let safePage = 0;

  try {
    // 🌟 修复核心：安全解构，如果 page 为空则默认为 0
    let { page, query } = await request.json().catch(() => ({ page: 0, query: '' }));
    
    // 如果前端传过来了 page，确保它是数字类型；如果没传，则使用 0
    safePage = page !== undefined ? parseInt(page, 10) : 0;
    if (isNaN(safePage)) safePage = 0;

    // 🌟 修复核心：在 JS 里提前计算好偏移量，避免直接在 SQL 语句中写计算式导致语法错误
    const offset = safePage * 10;

    if (query) {
      // 这里的 env.IMG 对应你绑定的全大写 IMG
      const ps = env.IMG.prepare(`SELECT * FROM imginfo WHERE url LIKE ? LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, offset).all();
      
      const total = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?`).bind(`%${query}%`).first();
      
      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": results,
        "page": safePage,
        "total": total ? total.total : 0
      }, { headers: corsHeaders });

    } else {
      const ps = env.IMG.prepare(`SELECT * FROM imginfo ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      const total = await env.IMG.prepare(`SELECT COUNT(*) as total FROM imginfo`).first();
      
      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": results,
        "page": safePage,
        "total": total ? total.total : 0
      }, { headers: corsHeaders });
    }

  } catch (error) {
    // 发生错误时，安全地返回错误响应
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
