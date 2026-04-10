// MRT文創古亭6號 預約系統前端邏
// ====================================================
// 請在部署後修改以下設定
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxY_50GxceoJ1lsNqYL0DRGXoOe8j-9WjvHEgFcrjCt48k5PvsY7ph0Q5TIJnWwjH8G/exec'; // Google Apps Script 部署網址
const LIFF_ID = '2009661888-rmnfz4u2'; // LINE LIFF ID

// ===============================h=====================
// 全域狀態
var bookingData = {
    spaceId: '',
    spaceName: '',
    price: 0,
    name: '',
    phone: '',
    email: '',
    date: '',
    startTime: '',
    endTime: '',
    invoiceType: '',
    mobileBarcode: '',
    companyName: '',
    taxId: '',
    lineUserId: '',
    lineDisplayName: '',
    estimatedTotal: 0,
    eventTitle: ''
};

// ====================================================
// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initTimeSelects();
    initLiff();
    setMinDate();
});

// 設定最小預約日期（今天）
function setMinDate() {
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          dateInput.min = yyyy + '-' + mm + '-' + dd;
    }
}

// ====================================================
// 時間選單（08:00 ~ 22:00，30分鐘間隔）
function initTimeSelects() {
    const times = [];
    for (let h = 8; h <= 22; h++) {
          times.push(padTime(h) + ':00');
          if (h < 22) times.push(padTime(h) + ':30');
    }
    const startSel = document.getElementById('startTime');
    const endSel = document.getElementById('endTime');
    times.forEach(t => {
          const opt1 = new Option(t, t);
          const opt2 = new Option(t, t);
          startSel.appendChild(opt1);
          endSel.appendChild(opt2);
    });
    startSel.addEventListener('change', updateEndTimeOptions);
    startSel.addEventListener('change', updatePrice);
    endSel.addEventListener('change', updatePrice);
    document.getElementById('bookingDate').addEventListener('change', updatePrice);
}

function padTime(n) {
    return String(n).padStart(2, '0');
}

function updateEndTimeOptions() {
    const startSel = document.getElementById('startTime');
    const endSel = document.getElementById('endTime');
    const startVal = startSel.value;
    if (!startVal) return;
    const [h, m] = startVal.split(':').map(Number);
    const startMins = h * 60 + m;
    Array.from(endSel.options).forEach(opt => {
          const [eh, em] = opt.value.split(':').map(Number);
          const endMins = eh * 60 + em;
          opt.disabled = endMins <= startMins + 30;
    });
    if (endSel.selectedIndex >= 0 && endSel.options[endSel.selectedIndex].disabled) {
          const firstEnabled = Array.from(endSel.options).find(o => !o.disabled);
          if (firstEnabled) endSel.value = firstEnabled.value;
    }
    updatePrice();
}

function updatePrice() {
    const startVal = document.getElementById('startTime').value;
    const endVal = document.getElementById('endTime').value;
    if (!startVal || !endVal || !bookingData.price) return;
    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = endVal.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins <= startMins) return;
    const durationHours = (endMins - startMins) / 60;
    // 基本費用計算：以4小時為基準，按比例計算
  const basePrice = bookingData.price; // 4小時基本價格
  const pricePerHour = basePrice / 4;
    const total = Math.round(durationHours * pricePerHour);
    bookingData.estimatedTotal = total;
    document.getElementById('estimatedPrice').textContent = 'NT$' + total.toLocaleString();
}

// ====================================================
// LIFF 初始化
async function initLiff() {
    try {
          await liff.init({ liffId: LIFF_ID });
          if (liff.isLoggedIn()) {
                  const profile = await liff.getProfile();
                  bookingData.lineUserId = profile.userId;
                  bookingData.lineDisplayName = profile.displayName;
                  showLineLoggedIn(profile.displayName);
          }
    } catch (e) {
          console.error('LIFF init error:', e);
    }
}

async function liffLogin() {
    if (!liff.isLoggedIn()) {
          liff.login();
    } else {
          const profile = await liff.getProfile();
          bookingData.lineUserId = profile.userId;
          bookingData.lineDisplayName = profile.displayName;
          showLineLoggedIn(profile.displayName);
    }
}

function showLineLoggedIn(name) {
    document.getElementById('lineLoginArea').style.display = 'none';
    document.getElementById('lineLoggedIn').style.display = 'block';
    document.getElementById('lineDisplayName').textContent = name;
}

// ====================================================
// 發票欄位切換
function toggleInvoiceFields() {
    const type = document.getElementById('invoiceType').value;
    document.getElementById('personalFields').style.display = type === 'personal' ? 'block' : 'none';
    document.getElementById('companyFields').style.display = type === 'company' ? 'block' : 'none';
}

// ====================================================
// 選擇空間
function selectSpace(spaceId, price) {
    bookingData.spaceId = spaceId;
    bookingData.spaceName = '空間 ' + spaceId;
    bookingData.price = price;
    document.getElementById('selectedSpace').value = bookingData.spaceName + '（NT$' + price.toLocaleString() + '/4小時）';
    goToStep(2);
    updatePrice();
}

// ====================================================
// 步驟跳轉
function goToStep(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('step' + n);
    if (target) {
          target.classList.add('active');
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function goBack(n) {
    goToStep(n);
}

// ====================================================
// 前往付款確認
function goToPayment() {
    // 驗證表單
  const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const date = document.getElementById('bookingDate').value;
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const invoiceType = document.getElementById('invoiceType').value;

  if (!name || !phone || !email || !date || !start || !end || !invoiceType) {
        alert('請填寫所有必填欄位');
        return;
  }
    if (!bookingData.lineUserId) {
          alert('請先登入 LINE 以完成預約');
          return;
    }
    if (invoiceType === 'company') {
          const companyName = document.getElementById('companyName').value.trim();
          const taxId = document.getElementById('taxId').value.trim();
          if (!companyName || !taxId) {
                  alert('請填寫公司名稱和統一編號');
                  return;
          }
          bookingData.companyName = companyName;
          bookingData.taxId = taxId;
    }

  // 時間驗證
  const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
          alert('結束時間必須晚於開始時間');
          return;
    }

  // 儲存資料
  bookingData.name = name;
    bookingData.phone = phone;
    bookingData.email = email;
    bookingData.date = date;
    bookingData.startTime = start;
    bookingData.endTime = end;
    bookingData.invoiceType = invoiceType;
    bookingData.mobileBarcode = document.getElementById('mobileBarcode').value.trim();

  // 顯示確認頁
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const dateObj = new Date(date + 'T00:00:00');
    const dayStr = dayNames[dateObj.getDay()];
    const formattedDate = date + '（' + dayStr + '）';

  document.getElementById('orderSummary').innerHTML = `
      <p><strong>空間</strong><span>${bookingData.spaceName}</span></p>
          <p><strong>姓名</strong><span>${name}</span></p>
              <p><strong>日期</strong><span>${formattedDate}</span></p>
                  <p><strong>時間</strong><span>${start} - ${end}</span></p>
                      <p><strong>發票</strong><span>${invoiceType === 'personal' ? '個人' : '公司'}</span></p>
                          <p><strong>金額</strong><span style="color:#e05c2a;font-weight:700">NT$${bookingData.estimatedTotal.toLocaleString()}</span></p>
                            `;
    goToStep(3);
}

// ====================================================
// 送出付款（呼叫 GAS createOrder 取得動態綠界參數，再 POST 跳轉）
async function submitPayment() {
    const btn = document.getElementById('submitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '處理中...'; }

    try {
        // 1. 呼叫 GAS 建立訂單，取得動態綠界付款參數
        const payload = JSON.stringify({
                action: 'createOrder',
                space: bookingData.spaceId,
                date: bookingData.date,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
                name: bookingData.name,
                phone: bookingData.phone,
                email: bookingData.email,
                amount: bookingData.estimatedTotal,
                invoiceType: bookingData.invoiceType,
                barcode: bookingData.mobileBarcode,
                companyName: bookingData.companyName,
                taxId: bookingData.taxId,
                note: '',
                lineUserId: bookingData.lineUserId,
                lineDisplayName: bookingData.lineDisplayName
            });
        const res = await fetch(GAS_URL + '?data=' + encodeURIComponent(payload), {
            method: 'GET'
        });

        const data = await res.json();

        if (data.status !== 'ok' || !data.ecpay) {
            alert('建立訂單失敗：' + (data.message || '請稍後再試'));
            if (btn) { btn.disabled = false; btn.textContent = '確認並付款'; }
            return;
        }

        // 2. 動態建立 form，POST 到綠界 AioCheckOut
        const ecpay = data.ecpay;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = ecpay.endpoint;
        form.style.display = 'none';

        // 把所有參數（除了 endpoint）加入 form
        const exclude = ['endpoint'];
        Object.keys(ecpay).forEach(key => {
            if (exclude.includes(key)) return;
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = ecpay[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();

    } catch (err) {
        console.error('submitPayment error:', err);
        alert('發生錯誤，請稍後再試：' + err.message);
        if (btn) { btn.disabled = false; btn.textContent = '確認並付款'; }
    }
}
