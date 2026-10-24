# أولمبياد النخبة — iOS

مشروع iOS أصلي باستخدام SwiftUI وWKWebView، يعرض https://northelite.tech/. يحتاج اتصالاً بالشبكة.

## Codemagic

1. اربط المستودع بحساب Codemagic الشخصي، واختر `ios-simulator-check` لفحص البناء أولًا.
2. أنشئ تطبيقًا في App Store Connect بالمعرّف `tech.northelite.olympiad` (أو غيّر المعرّف هنا وفي `project.yml` و`codemagic.yaml` إذا كان محجوزًا).
3. أضف مفتاح App Store Connect API إلى Codemagic باسم تكامل `northelite`، وأعدّ شهادة توزيع Apple وملف provisioning لهذا المعرّف ضمن Code signing identities. لا تضف المفاتيح إلى Git.
4. شغّل `ios-testflight` يدويًا بعد نجاح الفحص. لا يرسل هذا المسار التطبيق إلى مراجعة App Store العامة تلقائيًا.
5. اختبر تسجيل الدخول والأدوار والرفع والتنزيل والروابط الخارجية على iPhone عبر TestFlight قبل التقديم. تسجيل الدخول عبر Google وتحويلات OAuth يحتاجان اختبارًا خاصًا؛ مسار العودة من المتصفح الخارجي غير مهيأ بعد.

النسخة الحالية غلاف للموقع المنشور؛ يعتمد محتواها على الاتصال بالإنترنت. قبولها من Apple غير مضمون وفق معيار الوظائف الدنيا 4.2. إشعارات PWA لا تتحول تلقائيًا إلى إشعارات iOS أصلية.
