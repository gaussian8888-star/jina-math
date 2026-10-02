// Vercel 서버 함수: 상담 신청을 받아 원장님 이메일로 알림을 보냅니다.
// 비밀값(API 키)은 코드에 쓰지 않고 Vercel 환경변수에서 읽습니다.
//   RESEND_API_KEY : Resend API 키
//   NOTIFY_TO      : 알림을 받을 이메일 주소
//   MAIL_FROM      : 보내는 사람 (예: 진아수학 <onboarding@resend.dev>)

const GRADES = [
  '초등 3학년', '초등 4학년', '초등 5학년', '초등 6학년',
  '중등 1학년', '중등 2학년', '중등 3학년'
];
const LIMIT = { parent: 40, phone: 20, message: 1000 };

const clean = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const cleanBlock = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  // 다른 사이트에서 보내는 요청 차단 (같은 주소에서 온 요청만 허용)
  const origin = req.headers.origin;
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch (e) { /* 무시 */ }
    if (host !== req.headers.host) return res.status(403).json({ ok: false });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // 스팸 방지용 숨김 칸: 사람은 비워 두고, 자동 프로그램은 채우는 경우가 많습니다.
  if (body.website) return res.status(200).json({ ok: true });

  const parent = clean(body.parent, LIMIT.parent);
  const phone = clean(body.phone, LIMIT.phone);
  const grade = clean(body.grade, 20);
  const message = cleanBlock(body.message, LIMIT.message);

  if (!parent) return res.status(400).json({ ok: false, error: 'parent' });
  if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) return res.status(400).json({ ok: false, error: 'phone' });
  if (!GRADES.includes(grade)) return res.status(400).json({ ok: false, error: 'grade' });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_TO;
  const from = process.env.MAIL_FROM || '진아수학 접수 <onboarding@resend.dev>';
  if (!key || !to) {
    console.error('환경변수 RESEND_API_KEY 또는 NOTIFY_TO가 설정되지 않았습니다.');
    return res.status(500).json({ ok: false });
  }

  const when = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const text =
`새 상담 신청이 들어왔습니다. (${when})

학부모: ${parent}
연락처: ${phone}
자녀 학년: ${grade}
문의 내용: ${message || '(없음)'}

※ 이 메일에는 개인정보가 들어 있습니다. 상담 후 처리방침의 보유 기간에 맞춰 삭제해 주세요.`;

  const html =
`<div style="font-family:system-ui,'Malgun Gothic',sans-serif;line-height:1.7;color:#1d2a5b">
<h2 style="margin:0 0 12px">새 상담 신청</h2>
<p style="margin:0 0 12px;color:#55608a">${esc(when)}</p>
<table style="border-collapse:collapse">
<tr><td style="padding:4px 16px 4px 0;color:#55608a">학부모</td><td>${esc(parent)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#55608a">연락처</td><td>${esc(phone)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#55608a">자녀 학년</td><td>${esc(grade)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#55608a;vertical-align:top">문의 내용</td><td>${esc(message || '(없음)').replace(/\n/g, '<br>')}</td></tr>
</table>
<p style="margin-top:20px;font-size:13px;color:#55608a">이 메일에는 개인정보가 들어 있습니다. 상담 후 처리방침의 보유 기간에 맞춰 삭제해 주세요.</p>
</div>`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[상담 신청] ${grade} ${parent}`,
        text,
        html
      }),
      signal: ctrl.signal
    });
    if (!r.ok) {
      // 개인정보가 로그에 남지 않도록 상태 코드만 기록합니다.
      console.error('메일 발송 실패, 상태 코드:', r.status);
      return res.status(502).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('메일 발송 오류:', e.name);
    return res.status(502).json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
};
