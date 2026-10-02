// 모바일 메뉴
const btn = document.querySelector('.menu-btn');
const nav = document.getElementById('nav');
btn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  })
);

// 상담 신청 폼
// 지금은 화면에서만 접수 확인을 보여 주는 데모입니다.
// 3주차 과제에서 아래 SEND_URL에 실제 접수 주소(알림 연결)를 넣어 연결합니다.
const SEND_URL = '/api/inquiry'; // 예: '/api/inquiry'
const form = document.getElementById('inquiry');
const msg = document.getElementById('form-msg');

function setMsg(text, type) {
  msg.textContent = text;
  msg.className = 'form-msg ' + type;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const parent = form.parent.value.trim();
  const phone = form.phone.value.trim();
  const grade = form.grade.value;

  [form.parent, form.phone, form.grade].forEach(el => el.removeAttribute('aria-invalid'));

  if (!parent) { form.parent.setAttribute('aria-invalid', 'true'); form.parent.focus(); return setMsg('학부모 성함을 입력해 주세요.', 'err'); }
  if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) { form.phone.setAttribute('aria-invalid', 'true'); form.phone.focus(); return setMsg('연락처를 010-0000-0000 형식으로 입력해 주세요.', 'err'); }
  if (!grade) { form.grade.setAttribute('aria-invalid', 'true'); form.grade.focus(); return setMsg('자녀 학년을 선택해 주세요.', 'err'); }
  if (!form.agree.checked) { form.agree.focus(); return setMsg('개인정보 수집·이용에 동의해 주셔야 접수할 수 있습니다.', 'err'); }

  const data = { parent, phone, grade, message: form.message.value.trim() };

  try {
    if (SEND_URL) {
      const res = await fetch(SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('send failed');
    }
    form.reset();
    setMsg('상담 신청이 접수되었습니다. 원장이 영업시간 내에 연락드리겠습니다.', 'ok');
  } catch (err) {
    setMsg('접수 중 문제가 생겼습니다. 잠시 뒤 다시 시도하거나 전화로 문의해 주세요.', 'err');
  }
});
