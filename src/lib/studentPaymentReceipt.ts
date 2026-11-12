// src/lib/studentPaymentReceipt.ts
// نظام توليد وطباعة سندات القبض والإيصالات المالية المهنية للطلاب - أكاديمية التفوق أون لاين

export interface StudentPaymentReceiptData {
  receiptNumber: string;
  receiptDate: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  studentGrade?: string;
  parentName?: string;
  amount: number;
  currency?: string; // default 'شيكل'
  paymentMethod?: string; // 'نقداً (كاش)', 'حوالة بنكية', 'شحن محفظة', 'بطاقة ائتمان'
  serviceName?: string; // الخدمة المقدمة (مثال: شحن رصيد المحفظة التعليمية، رسوم باقة حصص فردية، الخ)
  note?: string;
  previousBalance?: number;
  newBalance?: number;
  cashierName?: string;
  managerName?: string;
  academyName?: string;
  centerPhone?: string;
  centerEmail?: string;
  centerAddress?: string;
  centerLicense?: string;
  leadTeacherName?: string;
}

/**
 * دالة تفقيط الأرقام إلى كلمات عربية مخصصة للعملات (Tafqeet)
 * تحول الأرقام المالية (مثل 250) إلى "مائتان وخمسون شيكل جديد فقط لا غير"
 */
export function tafqeetArabic(numberInput: number, currencyName: string = 'شيكل جديد'): string {
  if (isNaN(numberInput) || numberInput === 0) {
    return `صفر ${currencyName} فقط لا غير`;
  }

  const isNegative = numberInput < 0;
  const absAmount = Math.abs(numberInput);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = [
    'عشرة',
    'أحد عشر',
    'اثنا عشر',
    'ثلاثة عشر',
    'أربعة عشر',
    'خمسة عشر',
    'ستة عشر',
    'سبعة عشر',
    'ثمانية عشر',
    'تسعة عشر'
  ];
  const hundreds = [
    '',
    'مائة',
    'مائتان',
    'ثلاثمائة',
    'أربعمائة',
    'خمسمائة',
    'ستمائة',
    'سبعمائة',
    'ثمانمائة',
    'تسعمائة'
  ];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result.length > 0) {
        result += ' و';
      }

      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        if (o > 0) {
          result += `${ones[o]} و${tens[t]}`;
        } else {
          result += tens[t];
        }
      }
    }

    return result;
  }

  function numberToWords(num: number): string {
    if (num === 0) return 'صفر';

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    const parts: string[] = [];

    if (billions > 0) {
      if (billions === 1) parts.push('مليار');
      else if (billions === 2) parts.push('ملياران');
      else if (billions >= 3 && billions <= 10) parts.push(`${convertGroup(billions)} مليارات`);
      else parts.push(`${convertGroup(billions)} مليار`);
    }

    if (millions > 0) {
      if (millions === 1) parts.push('مليون');
      else if (millions === 2) parts.push('مليونان');
      else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
      else parts.push(`${convertGroup(millions)} مليون`);
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف');
      else if (thousands === 2) parts.push('ألفان');
      else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
      else parts.push(`${convertGroup(thousands)} ألف`);
    }

    if (remainder > 0) {
      parts.push(convertGroup(remainder));
    }

    return parts.join(' و');
  }

  let finalWords = (isNegative ? 'سالب ' : '') + numberToWords(integerPart) + ` ${currencyName}`;

  if (decimalPart > 0) {
    finalWords += ` و${numberToWords(decimalPart)} أغورة/سنت`;
  }

  return `فقط ${finalWords} لا غير`;
}

/**
 * إنشاء رقم سند قبض فريد ومنظم بناءً على المعرف أو الوقت
 */
export function generateReceiptNumber(creditId?: string): string {
  if (creditId && creditId.length >= 6) {
    const cleanId = creditId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    return `REC-2026-${cleanId}`;
  }
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `REC-2026-${randomSuffix}`;
}

/**
 * إنشاء صفحة سند قبض مالي احترافية بصيغة HTML جاهزة للطباعة أو الحفظ كـ PDF
 */
export function generateStudentPaymentReceiptHtml(data: StudentPaymentReceiptData): string {
  const currency = data.currency || 'شيكل';
  const currencyNameForTafqeet = currency.includes('شيكل') ? 'شيكل جديد' : currency;
  const tafqeetText = tafqeetArabic(data.amount, currencyNameForTafqeet);
  const academyName = data.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي';
  const managerName = data.managerName || 'أ. د. زكي أبو علان';
  const cashierName = data.cashierName || 'الدائرة المالية والمحاسبية';
  const paymentMethod = data.paymentMethod || 'نقداً (كاش - سند قبض)';
  const formattedDate = data.receiptDate || new Date().toISOString().split('T')[0];
  const serviceName = data.serviceName || (data.note ? data.note : 'شحن رصيد المحفظة التعليمية وسداد رسوم الحصص الدراسية');
  const centerPhone = data.centerPhone || '059-8321040';
  const centerEmail = data.centerEmail || 'zakiabuillan@gmail.com';
  const centerAddress = data.centerAddress || 'المنصة التعليمية الرقمية المعتمدة - فلسطين';
  const centerLicense = data.centerLicense || 'ترخيص واعتماد رقم: EDU-2026-98442';

  const prevBalanceFormatted = data.previousBalance !== undefined 
    ? `${data.previousBalance >= 0 ? '+' : ''}${data.previousBalance.toFixed(2)} ₪`
    : '---';

  const newBalanceFormatted = data.newBalance !== undefined 
    ? `${data.newBalance >= 0 ? '+' : ''}${data.newBalance.toFixed(2)} ₪`
    : '---';

  // Barcode / verification hash simulation
  const verificationHash = `AT-VOUCH-${Math.abs(data.amount)}-${data.receiptNumber.replace(/[^A-Z0-9]/g, '')}`;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>سند قبض مالي - ${data.receiptNumber} - ${data.studentName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
    }

    body {
      font-family: 'Cairo', 'Tajawal', 'Almarai', 'Segoe UI Arabic', 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
      font-size: 13px;
      line-height: 1.6;
    }

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    .receipt-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 3px double #0d365a;
      border-radius: 20px;
      padding: 24px 28px;
      position: relative;
      overflow: hidden;
    }

    /* Subtle background watermark */
    .receipt-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(13, 54, 90, 0.035);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }

    .receipt-content {
      position: relative;
      z-index: 1;
    }

    /* Header Section */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border-bottom: 2px solid #0d365a;
      padding-bottom: 12px;
    }

    .header-logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0d365a 0%, #1e40af 100%);
      color: #D4A33C;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 900;
      box-shadow: 0 4px 10px rgba(13, 54, 90, 0.15);
      border: 2px solid #D4A33C;
    }

    .academy-title {
      font-size: 20px;
      font-weight: 900;
      color: #0d365a;
      margin: 0 0 2px 0;
      letter-spacing: -0.3px;
    }

    .academy-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      margin: 0;
    }

    .academy-sub-desc {
      font-size: 9.5px;
      color: #64748b;
      margin: 1px 0 0 0;
    }

    .receipt-meta-box {
      text-align: left;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 10px;
      display: inline-block;
    }

    .receipt-no {
      font-size: 14px;
      font-weight: 900;
      color: #0d365a;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    .receipt-date {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-top: 2px;
    }

    /* Main Title Ribbon */
    .title-ribbon {
      background: linear-gradient(135deg, #0d365a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      border: 1px solid #D4A33C;
      box-shadow: 0 4px 8px rgba(13, 54, 90, 0.1);
    }

    .title-ribbon-text {
      font-size: 16px;
      font-weight: 900;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-ribbon-tag {
      background: #D4A33C;
      color: #0f172a;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }

    /* Amount Highlighting Card */
    .amount-highlight-card {
      background: #fdfbf7;
      border: 2px dashed #D4A33C;
      border-radius: 14px;
      padding: 14px 20px;
      margin-bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .amount-box-col {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .amount-label {
      font-size: 12px;
      font-weight: 900;
      color: #78350f;
    }

    .amount-figure {
      font-size: 28px;
      font-weight: 900;
      color: #0d365a;
      font-family: 'Courier New', monospace;
      letter-spacing: -0.5px;
    }

    .amount-currency {
      font-size: 15px;
      font-weight: 900;
      color: #b45309;
    }

    .tafqeet-box {
      width: 100%;
      background: #ffffff;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 800;
      color: #9a3412;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Detailed Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }

    .info-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-item-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
    }

    .info-item-value {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }

    /* Payment Particulars / Statement */
    .statement-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 18px;
    }

    .statement-title {
      font-size: 11px;
      font-weight: 900;
      color: #0d365a;
      margin-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }

    .statement-desc {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
      line-height: 1.6;
    }

    /* Balances Mini Table */
    .balances-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .balance-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      text-align: center;
    }

    .balance-box.highlight {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .balance-box-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
    }

    .balance-box-val {
      font-size: 14px;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Signatures Section */
    .signatures-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 22px;
      padding-top: 14px;
      border-top: 2px dashed #cbd5e1;
    }

    .signature-card {
      text-align: center;
      background: #fafafa;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 12px 10px;
      position: relative;
    }

    .signature-title {
      font-size: 11px;
      font-weight: 900;
      color: #0d365a;
      margin-bottom: 2px;
    }

    .signature-role {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 24px;
    }

    .signature-line {
      border-bottom: 1.5px solid #94a3b8;
      width: 80%;
      margin: 0 auto 6px auto;
    }

    .signature-subtext {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 600;
    }

    /* Official Stamp Replica */
    .stamp-container {
      position: relative;
    }

    .stamp-circle {
      width: 64px;
      height: 64px;
      border: 2px dashed #b45309;
      border-radius: 50%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 900;
      color: #b45309;
      transform: rotate(-10deg);
      opacity: 0.85;
      background: rgba(212, 163, 60, 0.05);
    }

    /* Footer Verification Bar */
    .footer-bar {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
      font-weight: 700;
    }

    .barcode-sim {
      font-family: monospace;
      letter-spacing: 2px;
      font-size: 10px;
      color: #475569;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .receipt-wrapper {
        border: 2px solid #0d365a;
        box-shadow: none;
        padding: 16px 20px;
        max-width: 100%;
        border-radius: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="receipt-wrapper">
    <div class="receipt-watermark">أكاديمية التفوق</div>

    <div class="receipt-content">
      <!-- Header Table -->
      <table class="header-table">
        <tr>
          <td style="text-align: right; vertical-align: middle;">
            <div class="header-logo-container">
              <div class="logo-badge">🎓</div>
              <div>
                <h1 class="academy-title">${academyName}</h1>
                <p class="academy-subtitle">منظومة المتابعة الأكاديمية والمالية الشاملة</p>
                <p class="academy-sub-desc">إشراف: ${managerName} | معتمد محاسبياً ونظامياً لعام 2026</p>
              </div>
            </div>
          </td>
          <td style="text-align: left; vertical-align: middle;">
            <div class="receipt-meta-box">
              <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">رقم السند المالي</div>
              <div class="receipt-no">${data.receiptNumber}</div>
              <div class="receipt-date">📅 تاريخ التحرير: ${formattedDate}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Center Details Strip -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 7px 14px; margin-bottom: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; font-size: 10px; color: #475569; font-weight: 700;">
        <span>🏢 <strong>المركز:</strong> ${academyName}</span>
        <span>📋 <strong>الاعتماد:</strong> ${centerLicense}</span>
        <span>📍 <strong>الموقع:</strong> ${centerAddress}</span>
        <span>📞 <strong>هاتف المركز:</strong> ${centerPhone}</span>
        <span>✉️ <strong>البريد:</strong> ${centerEmail}</span>
      </div>

      <!-- Title Ribbon -->
      <div class="title-ribbon">
        <div class="title-ribbon-text">
          <span>🧾 سند قبض مالي رسمي / إيصال استلام دفعة</span>
        </div>
        <div class="title-ribbon-tag">
          نسخة معتمدة وموثقة ✅
        </div>
      </div>

      <!-- Service Provided & Payment Method Ribbon -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%); border: 1.5px solid #bae6fd; border-radius: 12px; padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🎯</span>
          <div>
            <div style="font-size: 9.5px; font-weight: 800; color: #0369a1; text-transform: uppercase;">الخدمة المقدمة / موضوع السند</div>
            <div style="font-size: 13.5px; font-weight: 900; color: #0c4a6e;">${serviceName}</div>
          </div>
        </div>
        <div style="text-align: left; background: #ffffff; border: 1px solid #cbd5e1; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; color: #0d365a; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
          طريقة السداد: <span style="color: #15803d; font-weight: 900;">${paymentMethod}</span>
        </div>
      </div>

      <!-- Amount Highlight Card -->
      <div class="amount-highlight-card">
        <div class="amount-box-col">
          <span class="amount-label">المبلغ المقبوض:</span>
          <span class="amount-figure">₪${data.amount.toFixed(2)}</span>
          <span class="amount-currency">${currency}</span>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #0d365a; background: #e2e8f0; padding: 4px 10px; border-radius: 6px;">
          طريقة الدفع: <strong>${paymentMethod}</strong>
        </div>
        
        <div class="tafqeet-box">
          <span style="font-size: 14px;">✍️</span>
          <span><strong>فقط وقدره:</strong> ${tafqeetText}</span>
        </div>
      </div>

      <!-- Detailed Info Grid -->
      <div class="info-grid">
        <div class="info-item">
          <span class="info-item-label">اسم الطالب الكلي (المستفيد)</span>
          <span class="info-item-value" style="color: #0d365a;">${data.studentName}</span>
        </div>

        <div class="info-item">
          <span class="info-item-label">الصف والمرحلة الدراسية</span>
          <span class="info-item-value">${data.studentGrade || 'المرحلة المعتمدة'}</span>
        </div>

        <div class="info-item">
          <span class="info-item-label">رقم هاتف الطالب / ولي الأمر</span>
          <span class="info-item-value" dir="ltr" style="text-align: right;">${data.studentPhone || 'غير مسجل'}</span>
        </div>

        <div class="info-item">
          <span class="info-item-label">المعلم المنسّب / التوجيه الدراسي</span>
          <span class="info-item-value">${data.leadTeacherName || 'إدارة الأكاديمية والدروس المعتمدة'}</span>
        </div>
      </div>

      <!-- Statement & Purpose -->
      <div class="statement-box">
        <div class="statement-title">البيان وموضوع الدفعة المالية:</div>
        <div class="statement-desc">
          ${data.note ? data.note : 'شحن رصيد المحفظة التعليمية للطالب وسداد رسوم الحصص الدراسية والمتابعة الأكاديمية.'}
        </div>
      </div>

      <!-- Balances Progression Row -->
      <div class="balances-row">
        <div class="balance-box">
          <div class="balance-box-label">الرصيد السابق قبل الدفعة</div>
          <div class="balance-box-val" style="color: #64748b;">${prevBalanceFormatted}</div>
        </div>
        <div class="balance-box highlight">
          <div class="balance-box-label">قيمة هذه الدفعة المضافة (+)</div>
          <div class="balance-box-val" style="color: #166534;">+₪${data.amount.toFixed(2)}</div>
        </div>
        <div class="balance-box" style="border-color: #cbd5e1; background: #f1f5f9;">
          <div class="balance-box-label">الرصيد الإجمالي المحدث</div>
          <div class="balance-box-val" style="color: #0d365a; font-weight: 900;">${newBalanceFormatted}</div>
        </div>
      </div>

      <!-- Signatures Row -->
      <div class="signatures-section">
        <div class="signature-card">
          <div class="signature-title">المستلم / أمين الصندوق</div>
          <div class="signature-role">${cashierName}</div>
          <div class="signature-line"></div>
          <div class="signature-subtext">التوقيع والاعتماد</div>
        </div>

        <div class="signature-card stamp-container">
          <div class="signature-title">ختم الاعتماد الرسمي</div>
          <div class="signature-role">أكاديمية التفوق للتمكين</div>
          <div class="stamp-circle">
            <span>أكاديمية التفوق</span>
            <span style="font-size: 7px; color: #0d365a;">معتمد رسمياً</span>
            <span>2026</span>
          </div>
          <div class="signature-subtext" style="margin-top: 6px;">خاتم الإدارة العامة</div>
        </div>

        <div class="signature-card">
          <div class="signature-title">مدير المنصة العام</div>
          <div class="signature-role">${managerName}</div>
          <div class="signature-line"></div>
          <div class="signature-subtext">المصادقة الإدارية</div>
        </div>
      </div>

      <!-- Footer Bar -->
      <div class="footer-bar">
        <div>
          <span>حقوق المتابعة وإصدار السندات محفوظة © لأكاديمية التفوق أون لاين</span>
        </div>
        <div>
          <span class="barcode-sim">||| | || ||||| | ||| ${verificationHash}</span>
        </div>
        <div>
          <span>سند رقم: ${data.receiptNumber}</span>
        </div>
      </div>
    </div>
  </div>

</body>
</html>
`;
}

/**
 * دالة توليد رسالة واتساب منسقة لإرسال السند إلى هاتف الطالب أو ولي أمره بنقرة واحدة
 */
export function buildStudentPaymentWhatsAppText(data: StudentPaymentReceiptData): string {
  const formattedDate = data.receiptDate || new Date().toISOString().split('T')[0];
  const serviceName = data.serviceName || (data.note ? data.note : 'شحن رصيد المحفظة التعليمية وسداد رسوم الحصص الدراسية');
  const newBalanceText = data.newBalance !== undefined ? `\n💰 *الرصيد المحدث في المحفظة:* ₪${data.newBalance.toFixed(2)}` : '';
  
  return `*${data.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي'}* 🎓
*إشعار سند قبض مالي رسمي* 🧾
----------------------------------------
عزيزنا ولي أمر الطالب/ة: *${data.studentName}*
تم استلام وتوثيق الدفعة المالية بنجاح وفق البيانات التالية:

📄 *رقم السند:* ${data.receiptNumber}
📅 *تاريخ العملية:* ${formattedDate}
🎯 *الخدمة المقدمة:* ${serviceName}
💵 *المبلغ المقبوض:* ₪${data.amount.toFixed(2)} شيكل
✍️ *المبلغ كتابةً:* ${tafqeetArabic(data.amount)}
💳 *طريقة السداد:* ${data.paymentMethod || 'نقداً (كاش)'}
📝 *البيان وملاحظات السند:* ${data.note || serviceName}${newBalanceText}
----------------------------------------
🏢 *تفاصيل المركز:* ${data.academyName || 'أكاديمية التفوق أون لاين'}
📞 *هاتف التواصل:* ${data.centerPhone || '059-8321040'}
✉️ *البريد الإلكتروني:* ${data.centerEmail || 'zakiabuillan@gmail.com'}
----------------------------------------
شاكرين لكم حسن تعاونكم واهتمامكم بمستقبل أبنائكم التعليمي.
_إدارة المركز: ${data.managerName || 'أ. د. زكي أبو علان'}_`;
}
