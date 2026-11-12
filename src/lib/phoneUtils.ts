/**
 * Phone formatting utilities for Palestine/48 region (+972 / +970)
 * Ensures automatic WhatsApp formatting and reliable chat opening across student management.
 */

/**
 * Normalizes any phone input into a standard full international phone string: +972XXXXXXXXX
 * Handles inputs like:
 * - "0501234567" -> "+972501234567"
 * - "0599123456" -> "+972599123456"
 * - "501234567" -> "+972501234567"
 * - "972501234567" -> "+972501234567"
 * - "+972501234567" -> "+972501234567"
 * - "00972501234567" -> "+972501234567"
 * - "059-912-3456" -> "+972599123456"
 */
export function formatWhatsAppPhone972(input: string = ''): string {
  if (!input || !input.trim()) return '';
  let clean = input.replace(/\D/g, '').replace(/^0+/, '');
  if (clean.startsWith('972')) {
    clean = clean.substring(3).replace(/^0+/, '');
  } else if (clean.startsWith('970')) {
    clean = clean.substring(3).replace(/^0+/, '');
  }
  return clean ? `+972${clean}` : '';
}

/**
 * Extracts just the clean local digits without 0 or 972/970 prefix,
 * perfect for controlled input fields displaying next to a fixed prefix badge.
 */
export function cleanLocalPhoneDigits(input: string = ''): string {
  if (!input) return '';
  let clean = input.replace(/\D/g, '').replace(/^0+/, '');
  if (clean.startsWith('972')) {
    clean = clean.substring(3).replace(/^0+/, '');
  } else if (clean.startsWith('970')) {
    clean = clean.substring(3).replace(/^0+/, '');
  }
  return clean;
}

/**
 * Returns clean digits suitable for WhatsApp API (wa.me/XXXXXXXXXXX or api.whatsapp.com/send?phone=...)
 * Always ensures proper international prefix (972 or existing international code) without doubling.
 */
export function getWhatsAppApiNumber(input: string = ''): string {
  if (!input || !input.trim()) return '';
  let clean = input.replace(/\D/g, '').replace(/^0+/, '');
  
  // Already has 972 prefix
  if (clean.startsWith('972')) {
    return clean;
  }
  // Already has 970 prefix (Palestine)
  if (clean.startsWith('970')) {
    return clean;
  }
  // Any other international number with code >= 11 digits (e.g. Jordan 962..., KSA 966...)
  if (clean.length >= 11 && !clean.startsWith('5')) {
    return clean;
  }
  // Local number (e.g. 599123456, 501234567, 521234567)
  return clean ? `972${clean}` : '';
}

/**
 * Verifies if the phone has a valid local length (8-10 digits, usually 9 digits like 501234567)
 */
export function isValid972Phone(input: string = ''): boolean {
  const local = cleanLocalPhoneDigits(input);
  return local.length >= 8 && local.length <= 10;
}

/**
 * Extracts the best recipient phone number (parent phone prioritized, followed by student phone)
 */
export function getBestParentOrStudentPhone(student: any): string {
  if (!student) return '';
  return (
    student.parentPhone ||
    student.guardianPhone ||
    student.parentPhoneNumber ||
    student.phone ||
    student.phoneNumber ||
    student.whatsappNumber ||
    student.contact ||
    ''
  ).trim();
}

/**
 * Builds standard WhatsApp direct chat URL
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const apiPhone = getWhatsAppApiNumber(phone);
  if (!apiPhone) return '';
  return `https://api.whatsapp.com/send?phone=${apiPhone}&text=${encodeURIComponent(message)}`;
}

/**
 * Safely opens WhatsApp chat with fallback against popup blockers and copies text to clipboard
 */
export function openWhatsAppChat(phone: string, message: string): boolean {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;

  // Copy message to clipboard automatically as a reliable convenience
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(message).catch(() => {});
  }

  // Attempt window.open first
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened || opened.closed || typeof opened.closed === 'undefined') {
    // Popup was blocked or restricted; fallback to anchor click
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 100);
  }
  return true;
}

/**
 * Generates a tailored WhatsApp renewal reminder message urging parents to top up before package hours run out
 */
export function generatePackageRenewalWhatsAppMessage(params: {
  studentName: string;
  balance: number;
  hourlyRate?: number;
  remainingHours?: number;
  academyName?: string;
}): string {
  const {
    studentName,
    balance,
    hourlyRate,
    remainingHours,
    academyName = 'أكاديمية التفوق أون لاين'
  } = params;

  let lessonsCount = 1;
  if (hourlyRate && hourlyRate > 0 && balance > 0) {
    lessonsCount = Math.max(1, Math.round(balance / hourlyRate));
  } else if (remainingHours && remainingHours > 0) {
    lessonsCount = Math.max(1, Math.round(remainingHours));
  } else if (balance > 0) {
    lessonsCount = Math.max(1, Math.round(balance / 60));
  }

  const balanceDisplay = Math.round(balance);
  const approxLessonsText = ` (ما يعادل ${lessonsCount} حصة دراسية)`;

  return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة ${academyName}.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${studentName}) هو (${balanceDisplay} ₪)${approxLessonsText}.\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${studentName}) دوام التفوق والنجاح 🌸`;
}

/**
 * Generates an appropriate, respectful Arabic balance message for parents
 */
export function generateParentBalanceMessage(params: {
  studentName: string;
  balance: number;
  academyName?: string;
  remainingHours?: number;
  totalSpent?: number;
  totalToppedUp?: number;
  hourlyRate?: number;
  urgentRenewal?: boolean;
}): string {
  const {
    studentName,
    balance,
    academyName = 'أكاديمية التفوق أون لاين',
    remainingHours,
    hourlyRate,
    urgentRenewal
  } = params;

  let lessonsCount = 1;
  if (hourlyRate && hourlyRate > 0 && balance > 0) {
    lessonsCount = Math.max(1, Math.round(balance / hourlyRate));
  } else if (remainingHours && remainingHours > 0) {
    lessonsCount = Math.max(1, Math.round(remainingHours));
  } else if (balance > 0) {
    lessonsCount = Math.max(1, Math.round(balance / 60));
  }

  const balanceDisplay = Math.round(balance);
  const approxLessonsText = ` (ما يعادل ${lessonsCount} حصة دراسية)`;

  if (balance < 0) {
    const debt = Math.abs(balance);
    return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة ${academyName}.\n\nنود إحاطة عنايتكم الكريمة بأن رصيد الطالب/ة (${studentName}) مسجل حالياً بمبلغ مستحق قدره (${debt} ₪) بالسالب.\n\nيرجى التكرم بتسوية وسداد المبلغ وشحن رصيد المحفظة لضمان استمرار الحصص والدروس التعليمية دون انقطاع.\n\nشاكرين حسن تعاونكم الأكاديمي وثقتكم الدائمة بنا 🌸`;
  }

  if (balance === 0) {
    return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة ${academyName}.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${studentName}) هو (0 ₪) (ما يعادل 0 حصة دراسية).\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${studentName}) دوام التفوق والنجاح 🌸`;
  }

  // Determine if package/balance is near depletion (e.g. 1-2 lessons, <= 2 hours remaining, or low balance threshold)
  const isNearDepletion =
    urgentRenewal ||
    (lessonsCount <= 2) ||
    (remainingHours !== undefined && remainingHours > 0 && remainingHours <= 2) ||
    (hourlyRate && hourlyRate > 0 ? balance <= hourlyRate * 2.5 : balance <= 180);

  if (isNearDepletion) {
    return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة ${academyName}.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${studentName}) هو (${balanceDisplay} ₪)${approxLessonsText}.\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${studentName}) دوام التفوق والنجاح 🌸`;
  }

  // Standard Positive balance (sufficient lessons remaining)
  return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة ${academyName}.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${studentName}) هو (${balanceDisplay} ₪)${approxLessonsText}.\n\nحساب الطالب نشط وجميع الحصص مستمرة كالمعتاد بحمد الله.\n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${studentName}) دوام التفوق والنجاح 🌸`;
}

