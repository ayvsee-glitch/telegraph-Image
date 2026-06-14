import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 小时
  'Content-Type': 'application/json'
};

export const runtime = 'edge';

export async function POST(request) {
  // 获取 Cloudflare 上下文
  const { env, cf, ctx } = getRequestContext();
  
  // 在外层声明安全兜底变量
  let safePage = 0;

  try {
    // 安全读取请求体，防止解析空 body 崩溃
    const body = await request.json().catch(() => ({}));
    const { page, query } = body;

    // 强制安全转换为数字
    if (page !== undefined && page !== null) {
      safePage = parseInt(page, 10);
    }
    if (isNaN(safePage) || safePage < 0) {
      safePage = 0;
    }

    // 在 JavaScript 层提前计算好偏移量，避免 SQL 拼接异常
    const offset = safePage * 10;

    // 最新版中，日志表一般叫 tgimglog，这里使用大写 env.IMG 绑定
    if (query) {
      const ps = env.IMG.prepare(`SELECT * FROM tgimglog WHERE url LIKE ? ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(`%${query}%`, offset).all();
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM tgimglog WHERE url LIKE ?`).bind(`%${query}%`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": results,
        "page": safePage,
        "total": total
      }, { headers: corsHeaders });

    } else {
      const ps = env.IMG.prepare(`SELECT * FROM tgimglog ORDER BY id DESC LIMIT 10 OFFSET ?`);
      const { results } = await ps.bind(offset).all();
      
      const totalResult = await env.IMG.prepare(`SELECT COUNT(*) as total FROM tgimglog`).first();
      const total = totalResult ? totalResult.total : 0;

      return Response.json({
        "code": 200,
        "success": true,
        "message": "success",
        "data": results,
        "page": safePage,
        "total": total
      }, { headers: corsHeaders });
    }

  } catch (error) {
    // 即使发生错误，也返回标准 JSON 格式，避免前端报 Unexpected token 'I'
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
