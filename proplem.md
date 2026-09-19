# تقرير أخطاء المنصة — ERB Elite
الصق هذا التقرير في محادثة المطور لتشخيص الأخطاء وحلها.
التاريخ: 2026-08-24T13:34:14.156Z
التصفية: نشطة
عدد الأخطاء: 270
## 1) [متوسط (Medium)] واجهة — جديد
id: b09711d5-1ada-4db8-b5ce-d10068ee8df1
الرسالة: فشل تحميل مورد: https://northelite.tech/icon.jpeg
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T13:32:35.940858+00:00
أول تسجيل: 2026-08-24T13:32:35.940858+00:00
Correlation: c_mt79zwkj_ap1i9k91
Request ID: r_mt79zwkk_1379b3547035
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "IMG",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt79zwkk_1379b3547035",
  "device_type": "mobile",
  "correlation_id": "c_mt79zwkj_ap1i9k91",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 2) [منخفض (Low)] API — جديد — ×5
id: 77c09c08-3411-4c0c-a9a3-c09a0a8126f2
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /academic/weekly-plans
URL: http://localhost:5173/academic/weekly-plans
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-24T13:02:14.179003+00:00
أول تسجيل: 2026-08-24T12:54:36.230887+00:00
Correlation: c_mt78368w_sonylv4h
Request ID: r_mt78wx5s_9e2503011c41
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt78wx5s_9e2503011c41",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt78368w_sonylv4h",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 3) [متوسط (Medium)] API — جديد
id: 623d328b-9983-462a-a096-0b85153924ef
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: http://localhost:5173/login/staff
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-24T12:39:06.744909+00:00
أول تسجيل: 2026-08-24T12:39:06.744909+00:00
Correlation: c_mt78368w_sonylv4h
Request ID: r_mt78368x_a2477fed02c3
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt78368x_a2477fed02c3",
  "device_type": "desktop",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt78368w_sonylv4h",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 4) [عالٍ (High)] Edge — جديد
id: 9dedd028-a431-4f24-8535-afedcc812eb1
الرسالة: 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 is not a valid model ID
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T10:13:33.562417+00:00
أول تسجيل: 2026-08-24T10:13:33.562417+00:00
Correlation: c_mt72vzt8_prpy14g0
Request ID: r_mt72vztd_b7ff473f0e2a
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "fn": "ai-generate",
  "os": "macOS",
  "browser": "Safari",
  "task_code": "edu_game",
  "error_name": "Error",
  "request_id": "r_mt72vztd_b7ff473f0e2a",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt72vzt8_prpy14g0",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 5) [متوسط (Medium)] واجهة — جديد
id: 06d2e804-64aa-49c5-be6d-f9bc730dd953
الرسالة: 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 is not a valid model ID
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T10:13:33.558057+00:00
أول تسجيل: 2026-08-24T10:13:33.558057+00:00
Correlation: c_mt72vzt8_prpy14g0
Request ID: r_mt72vzth_1c0d69d26c45
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
@https://northelite.tech/assets/index-CtPbMgAR.js:578:9891
Context:
{
  "os": "macOS",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Safari",
  "error_name": "Error",
  "request_id": "r_mt72vzth_1c0d69d26c45",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "stack_short": "@https://northelite.tech/assets/index-CtPbMgAR.js:578:9891",
  "correlation_id": "c_mt72vzt8_prpy14g0",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 6) [حرج (Critical)] Edge — جديد
id: 37cdfe69-82e4-4c3c-820a-8d855f27a0b4
الرسالة: HTTP 502 POST /functions/v1/ai-generate
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T10:13:33.554891+00:00
أول تسجيل: 2026-08-24T10:13:33.554891+00:00
Correlation: c_mt72vzt8_prpy14g0
Request ID: r_mt72vyiv_d2f828939446
Possible Cause: بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة.
HTTP: POST /functions/v1/ai-generate → 502
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 502,
  "browser": "Safari",
  "endpoint": "/functions/v1/ai-generate",
  "request_id": "r_mt72vyiv_d2f828939446",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "response_body": "{\"error\":\"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 is not a valid model ID\"}",
  "correlation_id": "c_mt72vzt8_prpy14g0",
  "possible_cause": "بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة."
}

---

## 7) [عالٍ (High)] API — جديد
id: fb261373-e96b-4892-9702-cb67ce850950
الرسالة: Failed to fetch — POST /rest/v1/academic_teacher_schedules
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T07:39:17.256465+00:00
أول تسجيل: 2026-08-24T07:39:17.256465+00:00
Correlation: c_mt6xc738_yzooko6n
Request ID: r_mt6xby1n_dc9f8873a2df
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/academic_teacher_schedules
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*",
  "method": "POST",
  "params": {
    "select": "*"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/academic_teacher_schedules",
  "error_name": "TypeError",
  "request_id": "r_mt6xby1n_dc9f8873a2df",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6xc738_yzooko6n",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 8) [عالٍ (High)] واجهة — جديد — ×8
id: 852e3d63-dc36-4e45-93c5-60c392b350bf
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T07:16:41.992132+00:00
أول تسجيل: 2026-08-24T07:14:24.878374+00:00
Correlation: c_mt6whjk8_ibsrscdl
Request ID: r_mt6wkjfv_37a2adc2a8a6
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6wkjfv_37a2adc2a8a6",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6whjk8_ibsrscdl",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 9) [عالٍ (High)] واجهة — جديد
id: 52b5e7b4-f1be-4091-bc8a-0c676399c23f
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T07:14:24.064414+00:00
أول تسجيل: 2026-08-24T07:14:24.064414+00:00
Correlation: c_mt6whjk8_ibsrscdl
Request ID: r_mt6whjp7_b106f6034a0d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6whjp7_b106f6034a0d",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6whjk8_ibsrscdl",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 10) [عالٍ (High)] واجهة — جديد
id: 9798b05b-7db0-475a-9d97-aeab0a00b1b1
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T07:14:24.053118+00:00
أول تسجيل: 2026-08-24T07:14:24.053118+00:00
Correlation: c_mt6whjk8_ibsrscdl
Request ID: r_mt6whjtv_1df8cef55835
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6whjtv_1df8cef55835",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6whjk8_ibsrscdl",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 11) [عالٍ (High)] واجهة — جديد
id: a77b6614-d07c-44f8-b015-83742f5b18fd
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T07:14:24.053106+00:00
أول تسجيل: 2026-08-24T07:14:24.053106+00:00
Correlation: c_mt6whjk8_ibsrscdl
Request ID: r_mt6whjwq_c45327c1047f
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6whjwq_c45327c1047f",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6whjk8_ibsrscdl",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 12) [منخفض (Low)] API — جديد
id: 03210ad0-b0e8-468c-9b2a-1a2650d40deb
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: محمد زكريا محمد سيد أحمد | الدور: teacher | الجوال: 0510621973
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T06:39:40.774907+00:00
أول تسجيل: 2026-08-24T06:39:40.774907+00:00
Correlation: c_mt6pv7gd_rk6phodv
Request ID: r_mt6v8xv3_49c5c4caa60c
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt6v8xv3_49c5c4caa60c",
  "user_phone": "0510621973",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt6pv7gd_rk6phodv",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 13) [منخفض (Low)] API — جديد — ×8
id: 61bcc98f-a62c-43e9-8a21-e438e75786d1
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: سامح حسن عبدالعال محمد | الدور: teacher | الجوال: 0561581379
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T05:56:57.485641+00:00
أول تسجيل: 2026-08-24T05:40:27.481263+00:00
Correlation: c_mt6t4s8s_l0e5qxbe
Request ID: r_mt6tq02c_277fabdcc3ec
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt6tq02c_277fabdcc3ec",
  "user_phone": "0561581379",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt6t4s8s_l0e5qxbe",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 14) [متوسط (Medium)] Edge — جديد — ×3
id: b4add455-46ef-4c1e-a57f-e49c2047aec9
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T05:46:26.347073+00:00
أول تسجيل: 2026-08-24T05:17:38.385492+00:00
Correlation: c_mt6sbfuq_9jbwh8a8
Request ID: r_mt6tchbj_fd1d566312c6
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Safari",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt6tchbj_fd1d566312c6",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».\",\"not_registered\":true}",
  "correlation_id": "c_mt6tchbj_qna6iq72",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 15) [حرج (Critical)] Edge — جديد
id: 6d89f4a2-cfe9-4512-9254-7b99679558bf
الرسالة: HTTP 502 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T05:46:10.56658+00:00
أول تسجيل: 2026-08-24T05:46:10.56658+00:00
Correlation: c_mt6talrg_jwkph5zc
Request ID: r_mt6tc2om_b46242f8e7d4
Possible Cause: بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة.
HTTP: POST /functions/v1/auth-phone-otp → 502
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 502,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt6tc2om_b46242f8e7d4",
  "device_type": "mobile",
  "response_body": "{\"error\":\"تعذر إرسال واتساب. تأكد من اتصال خادم الواتساب ثم أعد المحاولة.\"}",
  "correlation_id": "c_mt6talrg_jwkph5zc",
  "possible_cause": "بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة."
}

---

## 16) [عالٍ (High)] API — جديد
id: 274b0b4d-ee88-42d8-893b-e32d10125d15
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: محي عبدالحميد محمد | الدور: teacher | الجوال: 0548667196
المسار: /
URL: https://northelite.tech/
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T05:24:14.432616+00:00
أول تسجيل: 2026-08-24T05:24:14.432616+00:00
Correlation: c_mt6sjxcg_nmsqm20b
Request ID: r_mt6sjwur_cd293e2b5290
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=id&user_id=eq.0961cbd6-5d56-4749-8909-a8454f87194a",
  "method": "GET",
  "params": {
    "select": "id",
    "user_id": "eq.0961cbd6-5d56-4749-8909-a8454f87194a"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt6sjwur_cd293e2b5290",
  "user_phone": "0548667196",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6sjxcg_nmsqm20b",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 17) [عالٍ (High)] API — جديد
id: 55743de6-f4f7-4b3a-94d6-74264be720f1
الرسالة: Failed to fetch — GET /rest/v1/academic_observation_assignments
المستخدم: محي عبدالحميد محمد | الدور: teacher | الجوال: 0548667196
المسار: /
URL: https://northelite.tech/
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T05:24:14.427279+00:00
أول تسجيل: 2026-08-24T05:24:14.427279+00:00
Correlation: c_mt6sjxcg_nmsqm20b
Request ID: r_mt6sjwur_bdae56f8265a
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/academic_observation_assignments
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&teacher_id=eq.0961cbd6-5d56-4749-8909-a8454f87194a&order=created_at.desc",
  "method": "GET",
  "params": {
    "order": "created_at.desc",
    "select": "*",
    "teacher_id": "eq.0961cbd6-5d56-4749-8909-a8454f87194a"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/academic_observation_assignments",
  "error_name": "TypeError",
  "request_id": "r_mt6sjwur_bdae56f8265a",
  "user_phone": "0548667196",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6sjxcg_nmsqm20b",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 18) [عالٍ (High)] API — جديد
id: d44bcc13-2c0d-4b08-83d4-23c6f698660f
الرسالة: Failed to fetch — GET /auth/v1/user
المستخدم: محي عبدالحميد محمد | الدور: teacher | الجوال: 0548667196
المسار: /
URL: https://northelite.tech/
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T05:24:14.230984+00:00
أول تسجيل: 2026-08-24T05:24:14.230984+00:00
Correlation: c_mt6sjxcg_nmsqm20b
Request ID: r_mt6sjwup_a2c6c358f1ff
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /auth/v1/user
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:29:2884
    at Kr (https://northelite.tech/assets/index-CtPbMgAR.js:29:9442)
    at Gr (https://northelite.tech/assets/index-CtPbMgAR.js:29:9184)
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "GET",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/auth/v1/user",
  "error_name": "TypeError",
  "request_id": "r_mt6sjwup_a2c6c358f1ff",
  "user_phone": "0548667196",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:29:2884\n    at Kr (https://northelite.tech/assets/index-CtPbMgAR.js:29:9442)\n    at Gr (https://northelite.tech/assets/index-CtPbMgAR.js:29:9184)",
  "correlation_id": "c_mt6sjxcg_nmsqm20b",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 19) [منخفض (Low)] API — جديد — ×23
id: 220f69d5-591c-4b30-b7ea-683685af06de
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: محمد عمر الشربيني | الدور: teacher | الجوال: 0552989271
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:59:16.009663+00:00
أول تسجيل: 2026-08-24T04:00:07.517291+00:00
Correlation: c_mt6pjq5r_x94q0nhz
Request ID: r_mt6rnt8h_c125befbdf48
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt6rnt8h_c125befbdf48",
  "user_phone": "0595218644",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt6rmilx_ephgen8a",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 20) [عالٍ (High)] API — جديد
id: 1c17a367-db7d-456a-a0e4-d6b8efc407ed
الرسالة: Load failed — POST /rest/v1/academic_teacher_schedules
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T04:54:07.161463+00:00
أول تسجيل: 2026-08-24T04:54:07.161463+00:00
Correlation: c_mt6rbrq4_bguiw3i0
Request ID: r_mt6rgsay_2a68714e1ae1
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/academic_teacher_schedules
Context:
{
  "os": "macOS",
  "type": "fetch_network",
  "query": "?select=*",
  "method": "POST",
  "params": {
    "select": "*"
  },
  "browser": "Safari",
  "endpoint": "/rest/v1/academic_teacher_schedules",
  "error_name": "TypeError",
  "request_id": "r_mt6rgsay_2a68714e1ae1",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6rbrq4_bguiw3i0",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 21) [متوسط (Medium)] واجهة — جديد
id: cf94c6be-3635-4c0c-9bca-9497bc177a4f
الرسالة: TypeError: Load failed
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T04:54:07.159036+00:00
أول تسجيل: 2026-08-24T04:54:07.159036+00:00
Correlation: c_mt6rbrq4_bguiw3i0
Request ID: r_mt6rh2b8_3ca334967d58
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
Context:
{
  "os": "macOS",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Safari",
  "error_name": "ObjectError",
  "request_id": "r_mt6rh2b8_3ca334967d58",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6rbrq4_bguiw3i0",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 22) [عالٍ (High)] API — جديد
id: 1dae5f1b-4f6c-4baa-9178-f621e973d50a
الرسالة: Load failed — POST /rest/v1/rpc/get_feature_visibility
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T04:54:07.103594+00:00
أول تسجيل: 2026-08-24T04:54:07.103594+00:00
Correlation: c_mt6rbrq4_bguiw3i0
Request ID: r_mt6rgk0s_c4fb22cc33ec
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/get_feature_visibility
Context:
{
  "os": "macOS",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Safari",
  "endpoint": "/rest/v1/rpc/get_feature_visibility",
  "error_name": "TypeError",
  "request_id": "r_mt6rgk0s_c4fb22cc33ec",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6rbrq4_bguiw3i0",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 23) [عالٍ (High)] API — جديد
id: d22c7dc1-1a82-48ce-a731-f72fb1c6bb62
الرسالة: Load failed — POST /rest/v1/academic_teacher_schedules
المستخدم: عبدالفتاح شوقي زويل | الدور: teacher | الجوال: 0541942345
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T04:54:07.060377+00:00
أول تسجيل: 2026-08-24T04:54:07.060377+00:00
Correlation: c_mt6rbrq4_bguiw3i0
Request ID: r_mt6rh1be_49c96131e75e
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/academic_teacher_schedules
Context:
{
  "os": "macOS",
  "type": "fetch_network",
  "query": "?select=*",
  "method": "POST",
  "params": {
    "select": "*"
  },
  "browser": "Safari",
  "endpoint": "/rest/v1/academic_teacher_schedules",
  "error_name": "TypeError",
  "request_id": "r_mt6rh1be_49c96131e75e",
  "user_phone": "0541942345",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6rbrq4_bguiw3i0",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 24) [عالٍ (High)] واجهة — جديد — ×39
id: 0bd99819-2f73-4c5f-9e8b-9c559f2c9358
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T04:49:28.373062+00:00
أول تسجيل: 2026-08-24T03:31:23.993289+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6rb7fc_9590070089dd
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6rb7fc_9590070089dd",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6r57yz_dzalsfjb",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 25) [عالٍ (High)] واجهة — جديد — ×14
id: 73442df2-1d14-4eca-86e3-ba1e9ad106dc
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T04:49:08.369651+00:00
أول تسجيل: 2026-08-24T03:31:46.624739+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6rarze_c812497b3899
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6rarze_c812497b3899",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6r57yz_dzalsfjb",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 26) [عالٍ (High)] واجهة — جديد — ×59
id: f6e18be0-8e05-47e0-87f4-84e8e8024910
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:44:49.608682+00:00
أول تسجيل: 2026-08-24T03:26:14.948313+00:00
Correlation: c_mt6oc3sm_qozt3n16
Request ID: r_mt6r58bj_8b82f8513626
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6r58bj_8b82f8513626",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6r57yz_dzalsfjb",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 27) [عالٍ (High)] API — جديد — ×3
id: 7926b392-fb47-4f1a-9ba7-88abd9eff7d6
الرسالة: Failed to fetch — GET /rest/v1/users
المستخدم: احمد محمد عبد المعبود | الدور: teacher | الجوال: 0502824036
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:41:38.580114+00:00
أول تسجيل: 2026-08-24T04:41:11.353486+00:00
Correlation: c_mt6qy71a_zam36y9o
Request ID: r_mt6r11do_7352426e17ce
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/users
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=id,email,full_name,role,avatar_url,is_active,staff_education_level,weekly_email_opt_in,absence_push_opt_in,phone,national_id,onboarding_completed,created_at,updated_at&id=eq.b7bf4ff6-117a-4366-b953-c1b11391867f",
  "method": "GET",
  "params": {
    "id": "eq.b7bf4ff6-117a-4366-b953-c1b11391867f",
    "select": "id,email,full_name,role,avatar_url,is_active,staff_education_level,weekly_email_opt_in,absence_push_opt_in,phone,national_id,onboarding_completed,created_at,updated_at"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/users",
  "error_name": "TypeError",
  "request_id": "r_mt6r11do_7352426e17ce",
  "user_phone": "0510621973",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt6pv7gd_rk6phodv",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 28) [عالٍ (High)] API — جديد
id: c7a846fc-531f-4864-bb8b-7aa98ed43691
الرسالة: Failed to fetch — HEAD /rest/v1/students
المستخدم: احمد محمد عبد المعبود | الدور: teacher | الجوال: 0502824036
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:41:11.314067+00:00
أول تسجيل: 2026-08-24T04:41:11.314067+00:00
Correlation: c_mt6qy71a_zam36y9o
Request ID: r_mt6qwrg5_e163902ca5cb
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: HEAD /rest/v1/students
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*",
  "method": "HEAD",
  "params": {
    "select": "*"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/students",
  "error_name": "TypeError",
  "request_id": "r_mt6qwrg5_e163902ca5cb",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6qy71a_zam36y9o",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 29) [متوسط (Medium)] واجهة — جديد
id: 79f9946f-5525-4025-9cac-c4c0e3543126
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: احمد محمد عبد المعبود | الدور: teacher | الجوال: 0502824036
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:41:11.271693+00:00
أول تسجيل: 2026-08-24T04:41:11.271693+00:00
Correlation: c_mt6qy71a_zam36y9o
Request ID: r_mt6qy725_a8235c303b5b
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt6qy725_a8235c303b5b",
  "device_type": "mobile",
  "correlation_id": "c_mt6qy71a_zam36y9o",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 30) [عالٍ (High)] API — جديد
id: 92ca1a45-1568-4f95-817d-cea10160e39a
الرسالة: Failed to fetch — POST /rest/v1/rpc/get_feature_visibility
المستخدم: احمد محمد عبد المعبود | الدور: teacher | الجوال: 0502824036
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:41:11.158474+00:00
أول تسجيل: 2026-08-24T04:41:11.158474+00:00
Correlation: c_mt6qy71a_zam36y9o
Request ID: r_mt6qwrg1_cca1a8aa8b3d
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/get_feature_visibility
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/get_feature_visibility",
  "error_name": "TypeError",
  "request_id": "r_mt6qwrg1_cca1a8aa8b3d",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6qy71a_zam36y9o",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 31) [عالٍ (High)] API — جديد
id: 5aba49fc-3bcf-453b-8fd7-14b0d85847c4
الرسالة: Failed to fetch — GET /auth/v1/user
المستخدم: محمد زكريا محمد سيد أحمد | الدور: teacher | الجوال: 0510621973
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:41:08.367845+00:00
أول تسجيل: 2026-08-24T04:41:08.367845+00:00
Correlation: c_mt6pv7gd_rk6phodv
Request ID: r_mt6r0hdk_0db03808090c
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /auth/v1/user
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:29:2884
    at Kr (https://northelite.tech/assets/index-DEN9l049.js:29:9442)
    at Gr (https://northelite.tech/assets/index-DEN9l049.js:29:9184)
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "GET",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/auth/v1/user",
  "error_name": "TypeError",
  "request_id": "r_mt6r0hdk_0db03808090c",
  "user_phone": "0510621973",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:29:2884\n    at Kr (https://northelite.tech/assets/index-DEN9l049.js:29:9442)\n    at Gr (https://northelite.tech/assets/index-DEN9l049.js:29:9184)",
  "correlation_id": "c_mt6pv7gd_rk6phodv",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 32) [عالٍ (High)] API — جديد
id: 11e7f8f7-322b-4dcf-94fa-555e43beace3
الرسالة: Failed to fetch — POST /rest/v1/rpc/touch_user_last_seen
المستخدم: محمد إسماعيل داود | الدور: teacher | الجوال: 0548248254
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:40:39.356238+00:00
أول تسجيل: 2026-08-24T04:40:39.356238+00:00
Correlation: c_mt6qztwt_8yk23q8l
Request ID: r_mt6o437h_8817a0789348
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/touch_user_last_seen
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/touch_user_last_seen",
  "error_name": "TypeError",
  "request_id": "r_mt6o437h_8817a0789348",
  "user_phone": "0548248254",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6qztwt_8yk23q8l",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 33) [عالٍ (High)] واجهة — جديد
id: d3542c76-0a96-45f6-aec9-ea787a00dfc7
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:34:01.881383+00:00
أول تسجيل: 2026-08-24T04:34:01.881383+00:00
Correlation: c_mt6q576x_6uf5y9zp
Request ID: r_mt6qrcjv_311077dbbfef
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6qrcjv_311077dbbfef",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6q576x_6uf5y9zp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 34) [عالٍ (High)] واجهة — جديد — ×2
id: 0d37c48f-5662-4587-81a0-6a6fff64b245
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /academic/lesson-topics
URL: https://northelite.tech/academic/lesson-topics
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:21:38.111592+00:00
أول تسجيل: 2026-08-24T04:18:33.178613+00:00
Correlation: c_mt6q576x_6uf5y9zp
Request ID: r_mt6qbene_2cb2a06de182
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6qbene_2cb2a06de182",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6q576x_6uf5y9zp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 35) [متوسط (Medium)] Edge — جديد
id: 4e3210dd-f7a4-4bd0-81e8-5f41d280e563
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:17:48.635673+00:00
أول تسجيل: 2026-08-24T04:17:48.635673+00:00
Correlation: c_mt6q576x_6uf5y9zp
Request ID: r_mt6q6hl4_96b63a0baea5
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt6q6hl4_96b63a0baea5",
  "device_type": "mobile",
  "response_body": "{\"error\":\"رمز التحقق غير صحيح\"}",
  "correlation_id": "c_mt6q576x_6uf5y9zp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 36) [عالٍ (High)] API — جديد
id: e124c687-26ed-4b67-92d6-ce954b15cf81
الرسالة: Failed to fetch — POST /rest/v1/rpc/get_feature_visibility
المستخدم: محمد زكريا محمد سيد أحمد | الدور: teacher | الجوال: 0510621973
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:09:02.30987+00:00
أول تسجيل: 2026-08-24T04:09:02.30987+00:00
Correlation: c_mt6pv7gd_rk6phodv
Request ID: r_mt6pv7e6_d97dd783882b
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/get_feature_visibility
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/get_feature_visibility",
  "error_name": "TypeError",
  "request_id": "r_mt6pv7e6_d97dd783882b",
  "user_phone": "0510621973",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt6pv7gd_rk6phodv",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 37) [عالٍ (High)] واجهة — جديد — ×2
id: ccbdf816-04aa-4591-83a7-e89382a8bc85
الرسالة: Script error.
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:04:09.585505+00:00
أول تسجيل: 2026-08-24T04:02:41.225207+00:00
Correlation: c_mt6pkwsz_guqu1adk
Request ID: r_mt6poxku_2a98731c5965
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6poxku_2a98731c5965",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6pkwsz_guqu1adk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 38) [متوسط (Medium)] Edge — جديد
id: 3a3a96b2-9765-4a7d-8d19-2bd800bd2b69
الرسالة: HTTP 409 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:03:32.242184+00:00
أول تسجيل: 2026-08-24T04:03:32.242184+00:00
Correlation: c_mt6pkwsz_guqu1adk
Request ID: r_mt6po4rl_b7491a38e92d
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: POST /functions/v1/auth-phone-otp → 409
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 409,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt6po4rl_b7491a38e92d",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول\"}",
  "correlation_id": "c_mt6pkwsz_guqu1adk",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 39) [متوسط (Medium)] واجهة — جديد
id: cc2f1d96-a040-4701-9d03-3aa933347154
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: جمال محمد احمد | الدور: teacher | الجوال: 0575249595
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T04:00:24.05672+00:00
أول تسجيل: 2026-08-24T04:00:24.05672+00:00
Correlation: c_mt6pk3rb_ep0nyrog
Request ID: r_mt6pk3rc_fbbe2c54f7e0
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt6pk3rc_fbbe2c54f7e0",
  "user_phone": "0575249595",
  "device_type": "mobile",
  "correlation_id": "c_mt6pk3rb_ep0nyrog",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 40) [عالٍ (High)] واجهة — جديد — ×5
id: 6a56e273-c14a-4aa0-a400-296a1d547f8f
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:57:23.522468+00:00
أول تسجيل: 2026-08-24T03:54:56.73501+00:00
Correlation: c_mt6p9jwe_c2b6yk76
Request ID: r_mt6pg82s_99c16ec77d40
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6pg82s_99c16ec77d40",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6p9jwe_c2b6yk76",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 41) [عالٍ (High)] واجهة — جديد — ×3
id: 571e834b-ccc7-4683-be95-9a44a2553f35
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:57:18.7565+00:00
أول تسجيل: 2026-08-24T03:56:47.725672+00:00
Correlation: c_mt6p9jwe_c2b6yk76
Request ID: r_mt6pg4m6_c49ebef96dc9
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6pg4m6_c49ebef96dc9",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6p9jwe_c2b6yk76",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 42) [عالٍ (High)] واجهة — جديد
id: d316f576-8468-4536-a9ab-eee893847438
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /support
URL: https://northelite.tech/support
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:46:50.478021+00:00
أول تسجيل: 2026-08-24T03:46:50.478021+00:00
Correlation: c_mt6oyoj2_2mw70rjq
Request ID: r_mt6p2noz_b3c4195e4c06
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6p2noz_b3c4195e4c06",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oyoj2_2mw70rjq",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 43) [متوسط (Medium)] واجهة — جديد
id: c1736c2c-0786-49f4-9087-d3ca24705372
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:42:53.250058+00:00
أول تسجيل: 2026-08-24T03:42:53.250058+00:00
Correlation: c_mt6ou9zx_lxmn7551
Request ID: r_mt6oxlf9_6c23cbdbf507
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt6oxlf9_6c23cbdbf507",
  "device_type": "mobile",
  "correlation_id": "c_mt6ou9zx_lxmn7551",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 44) [متوسط (Medium)] واجهة — جديد — ×3
id: 098c3d58-bb55-4c66-b809-ebddae614cc1
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:40:18.529836+00:00
أول تسجيل: 2026-08-24T03:30:12.101711+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ou9zx_cd1211af39ec
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt6ou9zx_cd1211af39ec",
  "device_type": "mobile",
  "correlation_id": "c_mt6ou9zx_lxmn7551",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 45) [متوسط (Medium)] واجهة — جديد — ×2
id: b404ccde-c7dc-4160-852d-cde8797c337b
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:39:43.139661+00:00
أول تسجيل: 2026-08-24T03:30:12.247283+00:00
Correlation: c_mt6oh9nh_96k0g39q
Request ID: r_mt6otioo_d74e5c0b9b50
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt6otioo_d74e5c0b9b50",
  "device_type": "mobile",
  "correlation_id": "c_mt6otcph_rmtskvvt",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 46) [عالٍ (High)] واجهة — جديد — ×3
id: 5aa86801-4d83-40d9-a127-900e5a91ca17
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:36:30.201706+00:00
أول تسجيل: 2026-08-24T03:32:14.421232+00:00
Correlation: c_mt6oc3sm_qozt3n16
Request ID: r_mt6opdvn_d66eb96a754d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6opdvn_d66eb96a754d",
  "user_phone": "0547353361",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6opdvn_maocaa23",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 47) [عالٍ (High)] API — جديد
id: 13ee6d07-8b3c-44fe-bfbe-1202a2fc6cf0
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: عبد الحليم عبدالله | الدور: teacher | الجوال: 0553297340
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:36:21.659991+00:00
أول تسجيل: 2026-08-24T03:36:21.659991+00:00
Correlation: c_mt6op6rj_47u4r43f
Request ID: r_mt6op6q0_7865cfbf8c69
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325
    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849
    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&user_id=eq.1f929d2f-035f-4eed-aa25-b8c584458ef4",
  "method": "GET",
  "params": {
    "select": "*",
    "user_id": "eq.1f929d2f-035f-4eed-aa25-b8c584458ef4"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt6op6q0_7865cfbf8c69",
  "user_phone": "0553297340",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ya.window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-CtPbMgAR.js:282:77799)\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48325\n    at https://northelite.tech/assets/index-CtPbMgAR.js:32:48849\n    at async https://northelite.tech/assets/index-CtPbMgAR.js:9:42938",
  "correlation_id": "c_mt6op6rj_47u4r43f",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 48) [عالٍ (High)] واجهة — جديد — ×2
id: d40df658-bdc6-474d-b4b5-14a7319bdae6
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:32:51.551785+00:00
أول تسجيل: 2026-08-24T03:29:35.327768+00:00
Correlation: c_mt6oc3sm_qozt3n16
Request ID: r_mt6okmev_84da4a2a64fc
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6okmev_84da4a2a64fc",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oc3sm_qozt3n16",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 49) [عالٍ (High)] واجهة — جديد — ×2
id: f5dc6c65-6c74-43c2-ba8c-2a3766680af1
الرسالة: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:32:07.418861+00:00
أول تسجيل: 2026-08-24T03:31:23.99847+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojr27_33db5f4c8dfc
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/dashboard:1:16
Context:
{
  "os": "macOS",
  "colno": 16,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "TypeError",
  "request_id": "r_mt6ojr27_33db5f4c8dfc",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:16",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 50) [عالٍ (High)] واجهة — جديد — ×5
id: 50ddb54d-67b9-4fe4-8d83-191fbc4943c4
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:32:07.401884+00:00
أول تسجيل: 2026-08-24T03:30:12.705645+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojr24_3f84ae4be9c7
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/dashboard:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "ReferenceError",
  "request_id": "r_mt6ojr24_3f84ae4be9c7",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:12",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 51) [عالٍ (High)] واجهة — جديد — ×5
id: 52c14bc3-65c6-468f-b862-0172e99f510a
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:32:07.387975+00:00
أول تسجيل: 2026-08-24T03:30:12.660247+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojr23_edb534fd0037
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/dashboard:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "TypeError",
  "request_id": "r_mt6ojr23_edb534fd0037",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 52) [عالٍ (High)] واجهة — جديد — ×2
id: 54475ef5-a132-4a7b-bfe5-f30b5e0cd704
الرسالة: Can't find variable: DarkReader
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:32:07.378253+00:00
أول تسجيل: 2026-08-24T03:31:23.918498+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojr23_ce430f038f0d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/dashboard:1:11
Context:
{
  "os": "macOS",
  "colno": 11,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "ReferenceError",
  "request_id": "r_mt6ojr23_ce430f038f0d",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:11",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 53) [عالٍ (High)] واجهة — جديد — ×3
id: 6a0a950c-2c68-4805-901c-b6a0be133278
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_7F2C799BD12443BF9D191687D8295162')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:32:07.360131+00:00
أول تسجيل: 2026-08-24T03:30:12.70627+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojr21_395ce6749dc4
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/dashboard:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "TypeError",
  "request_id": "r_mt6ojr21_395ce6749dc4",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 54) [عالٍ (High)] واجهة — جديد
id: d0b5f3f4-83aa-4c32-8f63-5b3d21b63f49
الرسالة: Script error.
المستخدم: اشرف الجمال | الدور: teacher | الجوال: 0531296306
المسار: /academic/schedule?setup=1
URL: https://northelite.tech/academic/schedule?setup=1
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:31:49.840938+00:00
أول تسجيل: 2026-08-24T03:31:49.840938+00:00
Correlation: c_mt6oc3sm_qozt3n16
Request ID: r_mt6ojaq7_45b86dcea0d9
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6ojaq7_45b86dcea0d9",
  "user_phone": "0531296306",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oc3sm_qozt3n16",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 55) [عالٍ (High)] واجهة — جديد — ×4
id: f68cf6ec-d862-4f5b-ba8f-651e240cbc4d
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:46.80061+00:00
أول تسجيل: 2026-08-24T03:30:41.071247+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojato_49b3816bd213
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "TypeError",
  "request_id": "r_mt6ojato_49b3816bd213",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 56) [عالٍ (High)] واجهة — جديد
id: 57ab52d7-40dd-4bc3-8348-7a78d67ba0b6
الرسالة: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:46.646867+00:00
أول تسجيل: 2026-08-24T03:31:46.646867+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojatx_eeccf6c208b7
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:16
Context:
{
  "os": "macOS",
  "colno": 16,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "TypeError",
  "request_id": "r_mt6ojatx_eeccf6c208b7",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:16",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 57) [عالٍ (High)] واجهة — جديد — ×4
id: e9f8a32e-7b9e-4dca-9804-a94cd0fbf81d
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:46.641866+00:00
أول تسجيل: 2026-08-24T03:30:41.111535+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojatq_ba2de4af44b2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "ReferenceError",
  "request_id": "r_mt6ojatq_ba2de4af44b2",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:12",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 58) [عالٍ (High)] واجهة — جديد — ×3
id: c084ca84-4e6d-4ce7-8f5f-6f7fa35613d5
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_7F2C799BD12443BF9D191687D8295162')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:46.641509+00:00
أول تسجيل: 2026-08-24T03:30:41.071377+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojatp_7d2f348155cd
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "TypeError",
  "request_id": "r_mt6ojatp_7d2f348155cd",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 59) [عالٍ (High)] واجهة — جديد
id: 1670df54-5dce-4494-89df-fe34f21233d3
الرسالة: Can't find variable: DarkReader
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:46.632485+00:00
أول تسجيل: 2026-08-24T03:31:46.632485+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6ojatq_7fee19023876
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:11
Context:
{
  "os": "macOS",
  "colno": 11,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "ReferenceError",
  "request_id": "r_mt6ojatq_7fee19023876",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:11",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 60) [عالٍ (High)] واجهة — جديد
id: 23ee497d-f05b-4f62-9403-24f2ffd1084d
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:37.820869+00:00
أول تسجيل: 2026-08-24T03:31:37.820869+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oj3zp_1c6e036c316b
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic",
  "error_name": "ReferenceError",
  "request_id": "r_mt6oj3zp_1c6e036c316b",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic:1:12",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 61) [عالٍ (High)] واجهة — جديد
id: d1567056-e224-4b80-a20d-2d9bab22c8b8
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_7F2C799BD12443BF9D191687D8295162')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:37.772996+00:00
أول تسجيل: 2026-08-24T03:31:37.772996+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oj3zp_1e8541274afb
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic",
  "error_name": "TypeError",
  "request_id": "r_mt6oj3zp_1e8541274afb",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 62) [عالٍ (High)] واجهة — جديد
id: 7b969ffb-41f7-4e5d-8730-9ff44f9b8fac
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:37.727017+00:00
أول تسجيل: 2026-08-24T03:31:37.727017+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oj3zo_89c23d19a236
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic",
  "error_name": "TypeError",
  "request_id": "r_mt6oj3zo_89c23d19a236",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 63) [عالٍ (High)] واجهة — جديد
id: 32147584-159f-4d94-a1df-be16a5818b0f
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:23.941215+00:00
أول تسجيل: 2026-08-24T03:31:23.941215+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oisjc_096cfccd0af8
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6oisjc_096cfccd0af8",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 64) [عالٍ (High)] واجهة — جديد
id: 97de7a6d-b572-4d55-ab6e-25fadb7fcd53
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:23.918189+00:00
أول تسجيل: 2026-08-24T03:31:23.918189+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oisj9_5e86bb2c9ada
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6oisj9_5e86bb2c9ada",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 65) [عالٍ (High)] واجهة — جديد
id: ed209024-bf60-4914-b87d-21c1bfbb29ae
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:23.918081+00:00
أول تسجيل: 2026-08-24T03:31:23.918081+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oisj7_82a8ee0b867d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6oisj7_82a8ee0b867d",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 66) [عالٍ (High)] واجهة — جديد
id: 4f221d0a-3d1e-40bc-8597-6322a41ae1be
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:31:23.917865+00:00
أول تسجيل: 2026-08-24T03:31:23.917865+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oisj9_24d5a5d88efd
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6oisj9_24d5a5d88efd",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 67) [عالٍ (High)] واجهة — جديد
id: 124674c3-24f2-4c62-88eb-ac2c8db6375f
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:30:12.102987+00:00
أول تسجيل: 2026-08-24T03:30:12.102987+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oh9i5_33700e5d369c
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt6oh9i5_33700e5d369c",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:19",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 68) [عالٍ (High)] واجهة — جديد
id: 27d1a911-3a08-4371-bd59-10b4c0a34ee4
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:30:12.097956+00:00
أول تسجيل: 2026-08-24T03:30:12.097956+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oh9i5_480d3da717a2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/login/staff:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "ReferenceError",
  "request_id": "r_mt6oh9i5_480d3da717a2",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:12",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 69) [عالٍ (High)] واجهة — جديد
id: 8675fcf8-a0b5-4913-a4f1-bee0f5ef38c3
الرسالة: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:30:12.090463+00:00
أول تسجيل: 2026-08-24T03:30:12.090463+00:00
Correlation: c_mt6oh9i4_hxjnqkjj
Request ID: r_mt6oh9if_ab6caaa5ea26
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:16
Context:
{
  "os": "macOS",
  "colno": 16,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt6oh9if_ab6caaa5ea26",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:16",
  "correlation_id": "c_mt6oh9i4_hxjnqkjj",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 70) [عالٍ (High)] واجهة — جديد
id: 04123a8b-73f6-4863-b613-ab2df6382a18
الرسالة: Script error.
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T03:26:54.650707+00:00
أول تسجيل: 2026-08-24T03:26:54.650707+00:00
Correlation: c_mt6oc3sm_qozt3n16
Request ID: r_mt6ocysk_3d0e8388bb88
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6ocysk_3d0e8388bb88",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt6oc3sm_qozt3n16",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 71) [متوسط (Medium)] API — جديد
id: 23f39482-d96a-4311-8e0d-71417170ec2d
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /principal/bulk-upload
URL: https://northelite.tech/principal/bulk-upload
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-24T03:23:08.986968+00:00
أول تسجيل: 2026-08-24T03:23:08.986968+00:00
Correlation: c_mt6o8764_eozyl438
Request ID: r_mt6o8764_0e8dd5acb8bf
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Safari",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt6o8764_0e8dd5acb8bf",
  "device_type": "mobile",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt6o8764_eozyl438",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 72) [منخفض (Low)] API — جديد — ×4
id: eeda4760-747a-4fd3-bb5e-fe261922fd23
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: محمد إسماعيل داود | الدور: teacher | الجوال: 0548248254
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-24T00:10:27.077193+00:00
أول تسجيل: 2026-08-24T00:04:49.531561+00:00
Correlation: c_mt6h55xv_0wn00oms
Request ID: r_mt6hce8k_d101ddc0ccad
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt6hce8k_d101ddc0ccad",
  "user_phone": "0548248254",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt6h55xv_0wn00oms",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 73) [متوسط (Medium)] Edge — جديد
id: 55354690-3e7c-400b-9f8d-847677f328ae
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T23:21:45.68663+00:00
أول تسجيل: 2026-08-23T23:21:45.68663+00:00
Correlation: c_mt6flryl_yb77o1mr
Request ID: r_mt6flryn_50a5baa0d3cd
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt6flryn_50a5baa0d3cd",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».\",\"not_registered\":true}",
  "correlation_id": "c_mt6flryl_yb77o1mr",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 74) [عالٍ (High)] واجهة — جديد — ×2
id: eae5570d-b994-4aa7-be1d-169b434b6ed4
الرسالة: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:33.894938+00:00
أول تسجيل: 2026-08-23T20:48:30.859395+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4rp3_9bb1fdd45a90
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/dashboard:1:16
Context:
{
  "os": "macOS",
  "colno": 16,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "TypeError",
  "request_id": "r_mt6a4rp3_9bb1fdd45a90",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:16",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 75) [عالٍ (High)] واجهة — جديد — ×8
id: 99e5c5d2-a44b-4501-ba05-6508981b6ca4
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:33.893823+00:00
أول تسجيل: 2026-08-23T20:48:30.836517+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4rp1_82e2c0f1b038
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6a4rp1_82e2c0f1b038",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 76) [عالٍ (High)] واجهة — جديد — ×7
id: 9000cecc-2088-497e-851a-006fce49ae03
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:33.884107+00:00
أول تسجيل: 2026-08-23T20:42:36.199088+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4roy_348f659a1233
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/dashboard:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "ReferenceError",
  "request_id": "r_mt6a4roy_348f659a1233",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 77) [عالٍ (High)] واجهة — جديد — ×7
id: 349c8f2c-d5d9-45a9-8d3e-caf2ad5ce723
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:33.87942+00:00
أول تسجيل: 2026-08-23T20:42:36.19723+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4row_256898de412d
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/dashboard:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "TypeError",
  "request_id": "r_mt6a4row_256898de412d",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 78) [عالٍ (High)] واجهة — جديد — ×2
id: 833366cd-89e1-4c80-a31f-dcf1ac562bd0
الرسالة: Can't find variable: DarkReader
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:33.874138+00:00
أول تسجيل: 2026-08-23T20:48:30.82998+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4row_8b24ee4f8ed8
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/dashboard:1:11
Context:
{
  "os": "macOS",
  "colno": 11,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "ReferenceError",
  "request_id": "r_mt6a4row_8b24ee4f8ed8",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:11",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 79) [عالٍ (High)] واجهة — جديد — ×5
id: c8c4baac-8c5c-402b-b472-0a4b04278995
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_419803FA90C840E0B1BDB8FBC72435FD')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:33.873635+00:00
أول تسجيل: 2026-08-23T20:42:36.197866+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4rou_ea389695a62f
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/dashboard:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/dashboard",
  "error_name": "TypeError",
  "request_id": "r_mt6a4rou_ea389695a62f",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/dashboard:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 80) [عالٍ (High)] واجهة — جديد — ×2
id: 7fe4efd9-f3a1-4480-92cb-4e976795496b
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_419803FA90C840E0B1BDB8FBC72435FD')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/homework
URL: https://northelite.tech/academic/homework
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:32.326543+00:00
أول تسجيل: 2026-08-23T20:47:55.432408+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4qi7_ee996cbff3aa
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/homework:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/homework",
  "error_name": "TypeError",
  "request_id": "r_mt6a4qi7_ee996cbff3aa",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/homework:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 81) [عالٍ (High)] واجهة — جديد — ×2
id: f0edd5fb-a317-48f7-8da0-f29dfff4ecb6
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/homework
URL: https://northelite.tech/academic/homework
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:32.325692+00:00
أول تسجيل: 2026-08-23T20:47:55.435054+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4qi8_44c27bb34838
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic/homework:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/homework",
  "error_name": "ReferenceError",
  "request_id": "r_mt6a4qi8_44c27bb34838",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/homework:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 82) [عالٍ (High)] واجهة — جديد — ×2
id: d22b292d-486c-4230-9f43-3f643393b775
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/homework
URL: https://northelite.tech/academic/homework
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:32.323779+00:00
أول تسجيل: 2026-08-23T20:47:55.432734+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4qi6_5af6d3d425ae
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/homework:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/homework",
  "error_name": "TypeError",
  "request_id": "r_mt6a4qi6_5af6d3d425ae",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/homework:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 83) [عالٍ (High)] واجهة — جديد
id: 4a83c59a-a768-40f7-b359-ee30b6d1218a
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:30.85744+00:00
أول تسجيل: 2026-08-23T20:48:30.85744+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4pbq_0f8f94e4601a
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6a4pbq_0f8f94e4601a",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 84) [عالٍ (High)] واجهة — جديد
id: a3152cc1-85ac-4e94-afe6-57a35da68c50
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:30.833926+00:00
أول تسجيل: 2026-08-23T20:48:30.833926+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4pbm_73d75eb8b7b5
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt6a4pbm_73d75eb8b7b5",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 85) [عالٍ (High)] واجهة — جديد
id: 46125e98-3357-471f-a699-4b8cf3ce839d
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/observation-tasks
URL: https://northelite.tech/academic/observation-tasks
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:28.616113+00:00
أول تسجيل: 2026-08-23T20:48:28.616113+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4ng1_b515c5f511a2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic/observation-tasks:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/observation-tasks",
  "error_name": "ReferenceError",
  "request_id": "r_mt6a4ng1_b515c5f511a2",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/observation-tasks:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 86) [عالٍ (High)] واجهة — جديد
id: 168d51b7-163b-4a04-a206-bfa2bf2ca7d6
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_419803FA90C840E0B1BDB8FBC72435FD')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/observation-tasks
URL: https://northelite.tech/academic/observation-tasks
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:28.609226+00:00
أول تسجيل: 2026-08-23T20:48:28.609226+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4ng0_3da948cc5d9c
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/observation-tasks:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/observation-tasks",
  "error_name": "TypeError",
  "request_id": "r_mt6a4ng0_3da948cc5d9c",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/observation-tasks:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 87) [عالٍ (High)] واجهة — جديد
id: 9e9d01a6-b00b-4fef-8bd1-6805e815f726
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/observation-tasks
URL: https://northelite.tech/academic/observation-tasks
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:48:28.608984+00:00
أول تسجيل: 2026-08-23T20:48:28.608984+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a4nfz_01ebf047b8eb
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/observation-tasks:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/observation-tasks",
  "error_name": "TypeError",
  "request_id": "r_mt6a4nfz_01ebf047b8eb",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/observation-tasks:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 88) [عالٍ (High)] واجهة — جديد — ×2
id: c82d14a6-e434-421e-b0d8-ce72a5a6c43e
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:47:36.37052+00:00
أول تسجيل: 2026-08-23T20:43:21.713588+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a3ja1_bb53af7378bf
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic",
  "error_name": "TypeError",
  "request_id": "r_mt6a3ja1_bb53af7378bf",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 89) [عالٍ (High)] واجهة — جديد — ×2
id: 82e29c78-62e8-4e25-ac2c-38c61c20e130
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:47:36.351631+00:00
أول تسجيل: 2026-08-23T20:43:21.719939+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a3ja6_d4917b416ff1
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic",
  "error_name": "ReferenceError",
  "request_id": "r_mt6a3ja6_d4917b416ff1",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 90) [عالٍ (High)] واجهة — جديد — ×2
id: 5b7b7e04-a47d-4b5c-8645-995a4628f6f4
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_419803FA90C840E0B1BDB8FBC72435FD')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic
URL: https://northelite.tech/academic
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:47:36.322859+00:00
أول تسجيل: 2026-08-23T20:43:21.712457+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt6a3ja5_e273ff17c1e7
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic",
  "error_name": "TypeError",
  "request_id": "r_mt6a3ja5_e273ff17c1e7",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 91) [عالٍ (High)] واجهة — جديد
id: 2089af35-cc65-43e0-9858-696294997f64
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:43:25.29547+00:00
أول تسجيل: 2026-08-23T20:43:25.29547+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69y5lw_3b6f1f530ddd
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic/schedule:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/schedule",
  "error_name": "ReferenceError",
  "request_id": "r_mt69y5lw_3b6f1f530ddd",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/schedule:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 92) [عالٍ (High)] واجهة — جديد
id: fb6a1482-8c6a-465a-a3e6-a7350ce93a66
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:43:25.294507+00:00
أول تسجيل: 2026-08-23T20:43:25.294507+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69y5lu_ef37634d3bce
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/schedule:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/schedule",
  "error_name": "TypeError",
  "request_id": "r_mt69y5lu_ef37634d3bce",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/schedule:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 93) [عالٍ (High)] واجهة — جديد
id: 9dc55377-9e11-496c-afd3-6cc29ac6ec48
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_419803FA90C840E0B1BDB8FBC72435FD')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/schedule
URL: https://northelite.tech/academic/schedule
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:43:25.293788+00:00
أول تسجيل: 2026-08-23T20:43:25.293788+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69y5lv_613e45ef8a23
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/schedule:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/schedule",
  "error_name": "TypeError",
  "request_id": "r_mt69y5lv_613e45ef8a23",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/schedule:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 94) [عالٍ (High)] واجهة — جديد
id: 48eb5908-09a7-4186-974b-91b897c2e2d1
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_419803FA90C840E0B1BDB8FBC72435FD')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:56.19473+00:00
أول تسجيل: 2026-08-23T20:42:56.19473+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69xj5h_f440b698bc7b
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "TypeError",
  "request_id": "r_mt69xj5h_f440b698bc7b",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 95) [عالٍ (High)] واجهة — جديد
id: 38f5591d-984e-4ecf-86f4-6093ba6f498f
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:56.194205+00:00
أول تسجيل: 2026-08-23T20:42:56.194205+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69xj5i_3e2b6b617af2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "ReferenceError",
  "request_id": "r_mt69xj5i_3e2b6b617af2",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 96) [عالٍ (High)] واجهة — جديد
id: b3f38004-ff85-4627-a564-6385e5ebee15
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:56.193797+00:00
أول تسجيل: 2026-08-23T20:42:56.193797+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69xj5g_a2016a01a58b
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/academic/weekly-plans:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/academic/weekly-plans",
  "error_name": "TypeError",
  "request_id": "r_mt69xj5g_a2016a01a58b",
  "user_phone": "0552971131",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/academic/weekly-plans:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 97) [عالٍ (High)] واجهة — جديد
id: 8b9af6ae-079b-439d-95bd-486944f2d22b
الرسالة: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:35.750315+00:00
أول تسجيل: 2026-08-23T20:42:35.750315+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69x2mx_f515eb3f04cf
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:16
Context:
{
  "os": "macOS",
  "colno": 16,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt69x2mx_f515eb3f04cf",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:16",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 98) [عالٍ (High)] واجهة — جديد
id: 6af83b61-7a3f-4580-9990-d4653ffde4d4
الرسالة: Can't find variable: __firefox__
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:35.747892+00:00
أول تسجيل: 2026-08-23T20:42:35.747892+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69x2mt_05a279ce5231
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/login/staff:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "ReferenceError",
  "request_id": "r_mt69x2mt_05a279ce5231",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:12",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 99) [عالٍ (High)] واجهة — جديد
id: 8bfaf78a-b2fc-4f6a-b29c-b53c64910bbc
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:35.747818+00:00
أول تسجيل: 2026-08-23T20:42:35.747818+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69x2mt_7ba8f27f2b12
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt69x2mt_7ba8f27f2b12",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:19",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 100) [عالٍ (High)] واجهة — جديد — ×2
id: d85fc389-1c5e-4497-9f0f-b0817c04c478
الرسالة: Script error.
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:35.747618+00:00
أول تسجيل: 2026-08-23T20:42:35.566188+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69x2ms_31a980db73f8
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt69x2ms_31a980db73f8",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 101) [متوسط (Medium)] واجهة — جديد
id: 6c2b6814-a143-4066-8b24-cefaca266919
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:35.746382+00:00
أول تسجيل: 2026-08-23T20:42:35.746382+00:00
Correlation: c_mt69x2ms_7p4tn8rp
Request ID: r_mt69x2mu_793165f7f813
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt69x2mu_793165f7f813",
  "device_type": "mobile",
  "correlation_id": "c_mt69x2ms_7p4tn8rp",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 102) [متوسط (Medium)] واجهة — جديد
id: 4b6ae6cb-dee8-408e-98d8-28249be7d05f
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: مصطفى عبدالرحمن أحمد أحمد | الدور: teacher | الجوال: 0552971131
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:42:35.706285+00:00
أول تسجيل: 2026-08-23T20:42:35.706285+00:00
Correlation: c_mt69x3bz_4ex5wj0r
Request ID: r_mt69x3bz_68e72e14f65f
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt69x3bz_68e72e14f65f",
  "device_type": "mobile",
  "correlation_id": "c_mt69x3bz_4ex5wj0r",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 103) [عالٍ (High)] API — جديد
id: ed55de78-d87b-41db-ad3b-838fe2d238e5
الرسالة: Load failed — POST /rest/v1/rpc/submit_support_ticket
المستخدم: سلطان سمير الشمري | الدور: teacher | الجوال: 0541506151
المسار: /support
URL: https://northelite.tech/support
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:35:19.454804+00:00
أول تسجيل: 2026-08-23T20:35:19.454804+00:00
Correlation: c_mt69l3gm_cl7ngzfz
Request ID: r_mt69nlq6_fb02bc4b4de4
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/submit_support_ticket
Context:
{
  "os": "macOS",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Safari",
  "endpoint": "/rest/v1/rpc/submit_support_ticket",
  "error_name": "TypeError",
  "request_id": "r_mt69nlq6_fb02bc4b4de4",
  "user_phone": "0541506151",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69l3gm_cl7ngzfz",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 104) [متوسط (Medium)] واجهة — جديد
id: 5c7f65d4-0cd7-456b-8b79-937cb6d0062b
الرسالة: TypeError: Load failed
المستخدم: سلطان سمير الشمري | الدور: teacher | الجوال: 0541506151
المسار: /support
URL: https://northelite.tech/support
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:35:19.448208+00:00
أول تسجيل: 2026-08-23T20:35:19.448208+00:00
Correlation: c_mt69l3gm_cl7ngzfz
Request ID: r_mt69nqpg_38cb41c57d01
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
Context:
{
  "os": "macOS",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Safari",
  "error_name": "ObjectError",
  "request_id": "r_mt69nqpg_38cb41c57d01",
  "user_phone": "0541506151",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69l3gm_cl7ngzfz",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 105) [متوسط (Medium)] واجهة — جديد
id: a06c0e19-5f4e-4f20-beb2-ab45a1880e72
الرسالة: تعذّر الاتصال بخادم Supabase — تحقق من الإنترنت ثم أعد المحاولة
المستخدم: سلطان سمير الشمري | الدور: teacher | الجوال: 0541506151
المسار: /support
URL: https://northelite.tech/support
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:35:19.448208+00:00
أول تسجيل: 2026-08-23T20:35:19.448208+00:00
Correlation: c_mt69l3gm_cl7ngzfz
Request ID: r_mt69nqpi_d7d953f076ca
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "type": "toast_error",
  "browser": "Safari",
  "error_name": "ObjectError",
  "request_id": "r_mt69nqpi_d7d953f076ca",
  "user_phone": "0541506151",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt69l3gm_cl7ngzfz",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 106) [متوسط (Medium)] Edge — جديد — ×2
id: 0cec8cd9-0f02-497e-8545-4ff9f1d47675
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T20:33:15.837577+00:00
أول تسجيل: 2026-08-23T20:23:46.735399+00:00
Correlation: c_mt698w22_7bfhns88
Request ID: r_mt69l3gm_cedc630e6bf3
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Safari",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt69l3gm_cedc630e6bf3",
  "device_type": "mobile",
  "response_body": "{\"error\":\"رمز التحقق غير صحيح\"}",
  "correlation_id": "c_mt69l3gm_cl7ngzfz",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 107) [متوسط (Medium)] Edge — جديد — ×3
id: 63c6f48f-abd1-45d3-88c5-2d184644e935
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T19:45:02.471817+00:00
أول تسجيل: 2026-08-23T19:19:36.072756+00:00
Correlation: c_mt66ycrd_jzwez47r
Request ID: r_mt67v2co_aea5f5624200
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt67v2co_aea5f5624200",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».\",\"not_registered\":true}",
  "correlation_id": "c_mt67v2co_wvzzfx5v",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 108) [منخفض (Low)] API — جديد — ×7
id: 727cb3b1-500c-4d5f-a550-459d0396b212
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: ماهر خليفه محمد | الدور: teacher | الجوال: 0558090672
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T19:34:16.421434+00:00
أول تسجيل: 2026-08-23T19:26:52.48204+00:00
Correlation: c_mt677knv_jzke8waa
Request ID: r_mt67h72e_cb3bbbb99015
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt67h72e_cb3bbbb99015",
  "user_phone": "0558090672",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt677knv_jzke8waa",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 109) [عالٍ (High)] API — جديد
id: 25025c00-d902-4d78-bc1b-ac7ddb482810
الرسالة: Failed to fetch — POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T19:29:06.352012+00:00
أول تسجيل: 2026-08-23T19:29:06.352012+00:00
Correlation: c_mt67al18_hr43pjsb
Request ID: r_mt67akzu_19021f7b0ec2
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/auth-phone-otp
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Gm (https://northelite.tech/assets/index-DEN9l049.js:213:53609)
    at une (https://northelite.tech/assets/index-DEN9l049.js:213:55083)
    at https://northelite.tech/assets/index-DEN9l049.js:282:120346
    at P (https://northelite.tech/assets/index-DEN9l049.js:282:120864)
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "error_name": "TypeError",
  "request_id": "r_mt67akzu_19021f7b0ec2",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Gm (https://northelite.tech/assets/index-DEN9l049.js:213:53609)\n    at une (https://northelite.tech/assets/index-DEN9l049.js:213:55083)\n    at https://northelite.tech/assets/index-DEN9l049.js:282:120346\n    at P (https://northelite.tech/assets/index-DEN9l049.js:282:120864)",
  "correlation_id": "c_mt67al18_hr43pjsb",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 110) [متوسط (Medium)] API — جديد
id: 86f3d862-c03d-454b-acd7-a892736d66dd
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T18:59:15.096041+00:00
أول تسجيل: 2026-08-23T18:59:15.096041+00:00
Correlation: c_mt6686zi_bafa0wzz
Request ID: r_mt6686zi_91207a2be18b
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=password",
  "method": "POST",
  "params": {
    "grant_type": "password"
  },
  "status": 400,
  "browser": "Safari",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt6686zi_91207a2be18b",
  "device_type": "mobile",
  "response_body": "{\"code\":\"invalid_credentials\",\"message\":\"Invalid login credentials\"}",
  "correlation_id": "c_mt6686zi_bafa0wzz",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 111) [متوسط (Medium)] واجهة — جديد
id: c92d4705-e1cb-4178-9d6a-3db7fd3e448b
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: hani abdelaal | الدور: student | الجوال: غير مسجّل
المسار: /auth/callback?intent=teacher
URL: https://northelite.tech/auth/callback?intent=teacher#access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6ImVlY2YzMmE5LTM1N2YtNDQwMy04ZGQzLTI0NGQwMzEyN2UyZCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2dqZ2V6ZGJibmV6c3ZzbXlncGNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2MjEwNTBlNS0wYjVkLTQ3ZGYtYTNlZi0wY2RkY2NiZmJlNDAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg3NTEzODgxLCJpYXQiOjE3ODc1MTAyODEsImVtYWlsIjoiaGFuaWFiZGVsYWFsNTJAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMeG1xc3NnSENtakF2OXVOMUNzLW1xRHpmbmltSVFocVNPY3pQQ1MyekF2dzBMSlE9czk2LWMiLCJlbWFpbCI6ImhhbmlhYmRlbGFhbDUyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJoYW5pIGFiZGVsYWFsIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6ImhhbmkgYWJkZWxhYWwiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMeG1xc3NnSENtakF2OXVOMUNzLW1xRHpmbmltSVFocVNPY3pQQ1MyekF2dzBMSlE9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwNzc0MDQ0MjE2OTE4OTEwODQwOSIsInN1YiI6IjEwNzc0MDQ0MjE2OTE4OTEwODQwOSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzg3NTEwMjgxfV0sInNlc3Npb25faWQiOiI2YjVjMTVjNi0wMDJjLTRmMTctOWE4My00NjgxOWFlNTg4OWUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.Bhn-cwbhiq0sHtes45tgYt1SQwzB76daQGUZ8XMUosamcd-1APlaPCjiNC9xqJGwzxMiOxq5-E1zcdwyYn4SBg&expires_at=1787513881&expires_in=3600&provider_token=ya29.a0AdMD6EiWz2WNyA-uvPMxJGmSOi-QRg_iJzSYRv4_mn9Xhm9Mv9dxqQutY8UKXyETpVcjIqVRz9HzX8lmb-aef2DMicERpjeAh4qv73GEqViXqbMuY_EaF3NDT4HHwQ76hIlVsbTEszNHiIzQeOuBJUL1OdU_Dw5FkqFsVE-8tQW-ARHY-1wWzTCovX7R4g0ravNPBz0aCgYKAToSARQSFQHGX2MiW-pbF_QjMd_7y4vuzdkhVA0206&refresh_token=6ibybvut2mgp&sb=&token_type=bearer
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:38:03.966446+00:00
أول تسجيل: 2026-08-23T18:38:03.966446+00:00
Correlation: c_mt65edyf_g6yc4aac
Request ID: r_mt65gy4v_c2a38eec4973
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt65gy4v_c2a38eec4973",
  "device_type": "mobile",
  "correlation_id": "c_mt65edyf_g6yc4aac",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 112) [متوسط (Medium)] واجهة — جديد — ×2
id: ac02ab1c-e007-4da4-b951-7466b99d0876
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:36:04.235697+00:00
أول تسجيل: 2026-08-23T18:33:25.4244+00:00
Correlation: c_mt65az2z_q05qzfi7
Request ID: r_mt65edyf_8c8b9364fda1
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt65edyf_8c8b9364fda1",
  "device_type": "mobile",
  "correlation_id": "c_mt65edyf_g6yc4aac",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 113) [متوسط (Medium)] واجهة — جديد — ×2
id: 101a3238-50d6-424d-afe4-d1564378eb72
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:35:45.272078+00:00
أول تسجيل: 2026-08-23T18:35:26.806361+00:00
Correlation: c_mt65dkup_yhw0fpe1
Request ID: r_mt65dz8r_f6139c958ebe
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt65dz8r_f6139c958ebe",
  "device_type": "mobile",
  "correlation_id": "c_mt65dz8r_oj0kqaq1",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 114) [عالٍ (High)] API — جديد
id: e0d26e48-0412-4825-87f5-4bb0a23248c3
الرسالة: Failed to fetch — GET /rest/v1/school_settings
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.340394+00:00
أول تسجيل: 2026-08-23T18:31:13.340394+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656qy3_6353755aa2f5
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/school_settings
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=value&key=eq.activity_week",
  "method": "GET",
  "params": {
    "key": "eq.activity_week",
    "select": "value"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/school_settings",
  "error_name": "TypeError",
  "request_id": "r_mt656qy3_6353755aa2f5",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 115) [عالٍ (High)] API — جديد
id: f31dfad6-83ef-4f27-bf9c-f1496be06844
الرسالة: Failed to fetch — GET /rest/v1/academic_config
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.330681+00:00
أول تسجيل: 2026-08-23T18:31:13.330681+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656qy6_a052aefaee33
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/academic_config
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=value&key=eq.enabled_education_levels",
  "method": "GET",
  "params": {
    "key": "eq.enabled_education_levels",
    "select": "value"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/academic_config",
  "error_name": "TypeError",
  "request_id": "r_mt656qy6_a052aefaee33",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 116) [عالٍ (High)] API — جديد — ×3
id: 6aa3a492-43df-4879-86a3-638c2e581a60
الرسالة: Failed to fetch — GET /rest/v1/users
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.329245+00:00
أول تسجيل: 2026-08-23T18:31:13.297566+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656rec_af9c673194b5
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/users
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=id,email,full_name,role,avatar_url,is_active,staff_education_level,weekly_email_opt_in,absence_push_opt_in,phone,national_id,onboarding_completed,created_at,updated_at&id=eq.215a4057-89ba-4774-9d31-4e2de040a8d1",
  "method": "GET",
  "params": {
    "id": "eq.215a4057-89ba-4774-9d31-4e2de040a8d1",
    "select": "id,email,full_name,role,avatar_url,is_active,staff_education_level,weekly_email_opt_in,absence_push_opt_in,phone,national_id,onboarding_completed,created_at,updated_at"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/users",
  "error_name": "TypeError",
  "request_id": "r_mt656rec_af9c673194b5",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 117) [عالٍ (High)] API — جديد
id: e0b3a932-6ef5-4e02-a104-18609a891bf0
الرسالة: Failed to fetch — GET /auth/v1/user
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.324344+00:00
أول تسجيل: 2026-08-23T18:31:13.324344+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656qxs_04ee8222a726
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /auth/v1/user
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:29:2884
    at Kr (https://northelite.tech/assets/index-DEN9l049.js:29:9442)
    at Gr (https://northelite.tech/assets/index-DEN9l049.js:29:9184)
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "GET",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/auth/v1/user",
  "error_name": "TypeError",
  "request_id": "r_mt656qxs_04ee8222a726",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:29:2884\n    at Kr (https://northelite.tech/assets/index-DEN9l049.js:29:9442)\n    at Gr (https://northelite.tech/assets/index-DEN9l049.js:29:9184)",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 118) [عالٍ (High)] API — جديد
id: 9fef2b56-1429-4777-b74b-984846b9bfb5
الرسالة: Failed to fetch — POST /rest/v1/rpc/get_feature_visibility
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.316126+00:00
أول تسجيل: 2026-08-23T18:31:13.316126+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656qxy_0d8b2b8e0de9
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/get_feature_visibility
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/get_feature_visibility",
  "error_name": "TypeError",
  "request_id": "r_mt656qxy_0d8b2b8e0de9",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 119) [عالٍ (High)] API — جديد
id: bb10279e-6100-43b2-aacf-6e138e4e6db2
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.277791+00:00
أول تسجيل: 2026-08-23T18:31:13.277791+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656qy1_8d46df498d31
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=id&user_id=eq.215a4057-89ba-4774-9d31-4e2de040a8d1",
  "method": "GET",
  "params": {
    "select": "id",
    "user_id": "eq.215a4057-89ba-4774-9d31-4e2de040a8d1"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt656qy1_8d46df498d31",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 120) [عالٍ (High)] API — جديد
id: a6362a64-3779-4b5f-a948-ebc03bb41525
الرسالة: Failed to fetch — GET /rest/v1/academic_subjects
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.262359+00:00
أول تسجيل: 2026-08-23T18:31:13.262359+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656qy8_77d11dbe9f83
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/academic_subjects
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&order=name.asc",
  "method": "GET",
  "params": {
    "order": "name.asc",
    "select": "*"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/academic_subjects",
  "error_name": "TypeError",
  "request_id": "r_mt656qy8_77d11dbe9f83",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 121) [عالٍ (High)] API — جديد
id: e62ffe6d-955f-4b1e-8ba0-a9caf6e0a52e
الرسالة: Failed to fetch — GET /rest/v1/users
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:31:13.257515+00:00
أول تسجيل: 2026-08-23T18:31:13.257515+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt65857q_ee0c1edc6f40
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/users
Stack:
TypeError: Failed to fetch
    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)
    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)
    at https://northelite.tech/assets/index-DEN9l049.js:32:48325
    at https://northelite.tech/assets/index-DEN9l049.js:32:48849
    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=id,email,full_name,role,avatar_url,is_active,staff_education_level,weekly_email_opt_in,absence_push_opt_in,phone,national_id,onboarding_completed,created_at,updated_at&id=eq.215a4057-89ba-4774-9d31-4e2de040a8d1",
  "method": "GET",
  "params": {
    "id": "eq.215a4057-89ba-4774-9d31-4e2de040a8d1",
    "select": "id,email,full_name,role,avatar_url,is_active,staff_education_level,weekly_email_opt_in,absence_push_opt_in,phone,national_id,onboarding_completed,created_at,updated_at"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/users",
  "error_name": "TypeError",
  "request_id": "r_mt65857q_ee0c1edc6f40",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Xa.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:34:13367)\n    at Bw.window.fetch (https://northelite.tech/assets/index-DEN9l049.js:282:77670)\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48325\n    at https://northelite.tech/assets/index-DEN9l049.js:32:48849\n    at async https://northelite.tech/assets/index-DEN9l049.js:9:42934",
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 122) [عالٍ (High)] واجهة — جديد
id: 6cb20e3b-c5b9-4cd5-b4d7-19febc3752fc
الرسالة: Script error.
المستخدم: ابراهيم  عطية | الدور: teacher | الجوال: 0534171994
المسار: /academic/teacher-setup
URL: https://northelite.tech/academic/teacher-setup
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:30:08.338827+00:00
أول تسجيل: 2026-08-23T18:30:08.338827+00:00
Correlation: c_mt64p85m_28hl1iec
Request ID: r_mt656r85_72f34975e0bb
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "colno": 0,
  "lineno": 0,
  "browser": "Chrome",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt656r85_72f34975e0bb",
  "user_phone": "0534171994",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt64p85m_28hl1iec",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 123) [متوسط (Medium)] Edge — جديد
id: cf4e4da9-ab86-4a07-948d-eea113053090
الرسالة: HTTP 409 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T18:27:42.140667+00:00
أول تسجيل: 2026-08-23T18:27:42.140667+00:00
Correlation: c_mt653mfl_r23l01wl
Request ID: r_mt653mfl_986305d81d5b
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: POST /functions/v1/auth-phone-otp → 409
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 409,
  "browser": "Safari",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt653mfl_986305d81d5b",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول\"}",
  "correlation_id": "c_mt653mfl_r23l01wl",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 124) [متوسط (Medium)] Edge — جديد — ×27
id: 84e4e96b-5733-4286-b5ae-7df7f57c8718
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:26:05.546595+00:00
أول تسجيل: 2026-08-23T17:37:41.156628+00:00
Correlation: c_mt63bahu_fqept812
Request ID: r_mt651jw0_a7db48cb2293
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "macOS",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Safari",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt651jw0_a7db48cb2293",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».\",\"not_registered\":true}",
  "correlation_id": "c_mt651jw0_p9hk2ett",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 125) [متوسط (Medium)] API — جديد — ×4
id: 32e5a7b8-7e6f-4d09-bd1a-0b454929d137
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T18:17:55.935147+00:00
أول تسجيل: 2026-08-23T18:06:39.773426+00:00
Correlation: c_mt64cj13_hnh4cr2v
Request ID: r_mt64r1ax_fce1932b9024
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=password",
  "method": "POST",
  "params": {
    "grant_type": "password"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt64r1ax_fce1932b9024",
  "device_type": "mobile",
  "response_body": "{\"code\":\"invalid_credentials\",\"message\":\"Invalid login credentials\"}",
  "correlation_id": "c_mt64r1ax_tnj4rqij",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 126) [عالٍ (High)] API — جديد
id: 71529c76-3843-46d5-b44d-421010948eb5
الرسالة: Load failed — POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T18:04:52.844498+00:00
أول تسجيل: 2026-08-23T18:04:52.844498+00:00
Correlation: c_mt643s2k_8o6tducf
Request ID: r_mt649e52_5a4ed5689185
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/auth-phone-otp
Context:
{
  "os": "macOS",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Safari",
  "endpoint": "/functions/v1/auth-phone-otp",
  "error_name": "TypeError",
  "request_id": "r_mt649e52_5a4ed5689185",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt643s2k_8o6tducf",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 127) [عالٍ (High)] واجهة — جديد — ×8
id: f462a494-6293-4f52-8452-bb20bd832340
الرسالة: Script error.
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:50:14.248156+00:00
أول تسجيل: 2026-08-23T17:38:18.917259+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63rfdj_4142d657d08d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt63rfdj_4142d657d08d",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt63rfdj_kt2uvciq",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 128) [متوسط (Medium)] واجهة — جديد
id: f490af63-a590-45bd-86d1-533949033ff8
الرسالة: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T17:46:02.256425+00:00
أول تسجيل: 2026-08-23T17:46:02.256425+00:00
Correlation: c_mt63m169_d6y44xen
Request ID: r_mt63m1fg_908f6dc9d804
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt63m1fg_908f6dc9d804",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt63m169_d6y44xen",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 129) [متوسط (Medium)] واجهة — جديد
id: 9afe5ac7-e8b0-42c7-b9b8-e89bab277ef0
الرسالة: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T17:46:02.254194+00:00
أول تسجيل: 2026-08-23T17:46:02.254194+00:00
Correlation: c_mt63m169_d6y44xen
Request ID: r_mt63m1fe_5355b0b784b6
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.
    at mh (https://northelite.tech/assets/index-DEN9l049.js:213:71891)
    at async Object.mutationFn (https://northelite.tech/assets/index-DEN9l049.js:419:98971)
Context:
{
  "os": "Android",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt63m1fe_5355b0b784b6",
  "device_type": "mobile",
  "stack_short": "Error: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.\n    at mh (https://northelite.tech/assets/index-DEN9l049.js:213:71891)\n    at async Object.mutationFn (https://northelite.tech/assets/index-DEN9l049.js:419:98971)",
  "correlation_id": "c_mt63m169_d6y44xen",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 130) [متوسط (Medium)] API — جديد
id: 4931e8fe-135c-4f17-a1e9-44a31d638d10
الرسالة: HTTP 409 DELETE /rest/v1/users
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T17:46:02.250951+00:00
أول تسجيل: 2026-08-23T17:46:02.250951+00:00
Correlation: c_mt63m169_d6y44xen
Request ID: r_mt63m1f3_026e816cea8c
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: DELETE /rest/v1/users → 409
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?id=eq.beb28c9e-10dc-46ba-9846-906eb727e4a8",
  "method": "DELETE",
  "params": {
    "id": "eq.beb28c9e-10dc-46ba-9846-906eb727e4a8"
  },
  "status": 409,
  "browser": "Chrome",
  "endpoint": "/rest/v1/users",
  "request_id": "r_mt63m1f3_026e816cea8c",
  "device_type": "mobile",
  "response_body": "{\"code\":\"23503\",\"details\":\"Key is still referenced from table \\\"academic_observation_reports\\\".\",\"hint\":null,\"message\":\"update or delete on table \\\"users\\\" violates foreign key constraint \\\"academic_observation_reports_requested_by_fkey\\\" on table \\\"academic_observation_reports\\\"\"}",
  "correlation_id": "c_mt63m169_d6y44xen",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 131) [عالٍ (High)] Edge — جديد
id: d6c78582-ab63-4403-8320-49de586b2981
الرسالة: HTTP 500 POST /functions/v1/delete-user
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T17:46:02.009054+00:00
أول تسجيل: 2026-08-23T17:46:02.009054+00:00
Correlation: c_mt63m169_d6y44xen
Request ID: r_mt63m029_4daf2f32905f
Possible Cause: عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط.
HTTP: POST /functions/v1/delete-user → 500
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 500,
  "browser": "Chrome",
  "endpoint": "/functions/v1/delete-user",
  "request_id": "r_mt63m029_4daf2f32905f",
  "device_type": "mobile",
  "response_body": "{\"error\":\"{}\"}",
  "correlation_id": "c_mt63m169_d6y44xen",
  "possible_cause": "عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط."
}

---

## 132) [متوسط (Medium)] واجهة — جديد
id: 08c61a54-83b1-4583-805b-d127d1b96f59
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: Mostafa Ahmed | الدور: student | الجوال: غير مسجّل
المسار: /auth/callback?intent=teacher
URL: https://northelite.tech/auth/callback?intent=teacher#access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6ImVlY2YzMmE5LTM1N2YtNDQwMy04ZGQzLTI0NGQwMzEyN2UyZCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2dqZ2V6ZGJibmV6c3ZzbXlncGNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5ODAxZDMwNS1jNDQzLTQ1YjgtYmUyZC00MzAwMjZjOTYxYTEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg3NTEwNTE2LCJpYXQiOjE3ODc1MDY5MTYsImVtYWlsIjoibWFnaDc4OTdAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJMVY4X1RBOFBKNmNFaWZLaDBVMWVYUDBNeG91UlB1M0xTOC1KWVJ1TDFLMkpEUVE9czk2LWMiLCJlbWFpbCI6Im1hZ2g3ODk3QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJNb3N0YWZhIEFobWVkIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6Ik1vc3RhZmEgQWhtZWQiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJMVY4X1RBOFBKNmNFaWZLaDBVMWVYUDBNeG91UlB1M0xTOC1KWVJ1TDFLMkpEUVE9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwNDUwMDU1MDA1MTc3MDYwNTA3MyIsInN1YiI6IjEwNDUwMDU1MDA1MTc3MDYwNTA3MyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzg3NTA2OTE2fV0sInNlc3Npb25faWQiOiJkMjRjMDk4Yy1mYzQ0LTRkZmUtOWQzYS1jMDhjYjEwN2U5ZTEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.iBr1E7MEOcXugqGaQdcxLiSNi6hkknJxtq5nu20klvzQM2HYAjQ2wd5vHTEe1KlE42qMonmdzAEAYr2Y6VcaCw&expires_at=1787510516&expires_in=3600&provider_token=ya29.a0AdMD6EjxtuC46M9HvtaDlG2VwtLdl5H8JZmqXefChhewKDhjsRntNE82jU8MvWRINQn9gUonOzFj6R7wXaTLaC-ZVMjM3I-bALWlmRVSuQfI4bA1Pf4YNslNwDMDFB2N3c-YuVRu7U3SVZeTVcgXiPjuMKgaAgqAIMc9k-ctl-Pv-A-QwPAKw-YvZKYmoJ0xm7Qm4fwaCgYKAQMSARQSFQHGX2Mi9-GoVNH0PCz-x_YZDfOVRg0206&refresh_token=q2beijwcmvcg&sb=&token_type=bearer
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:41:58.949468+00:00
أول تسجيل: 2026-08-23T17:41:58.949468+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63gtfs_0dcb539a44cf
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt63gtfs_0dcb539a44cf",
  "device_type": "mobile",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 133) [عالٍ (High)] واجهة — جديد — ×4
id: 85b764ab-cc80-4697-88d4-708db475af61
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:41:32.121838+00:00
أول تسجيل: 2026-08-23T17:38:53.168961+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63g8xc_af15b18175cf
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/register/teacher:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/register/teacher",
  "error_name": "TypeError",
  "request_id": "r_mt63g8xc_af15b18175cf",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/register/teacher:1:19",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 134) [عالٍ (High)] واجهة — جديد — ×4
id: 35eb8568-429a-42f8-8493-618612f4e604
الرسالة: Can't find variable: __firefox__
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:41:32.119946+00:00
أول تسجيل: 2026-08-23T17:38:53.16949+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63g8xe_d18061dda147
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/register/teacher:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/register/teacher",
  "error_name": "ReferenceError",
  "request_id": "r_mt63g8xe_d18061dda147",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/register/teacher:1:12",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 135) [عالٍ (High)] واجهة — جديد — ×2
id: 815baa6b-8eaa-41c7-ab3a-1a29086b631d
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_FB19952771CF494FBC2496306D2F8374')
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:40:38.918111+00:00
أول تسجيل: 2026-08-23T17:38:53.259108+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63f3vc_37109d6c337c
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/register/teacher:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/register/teacher",
  "error_name": "TypeError",
  "request_id": "r_mt63f3vc_37109d6c337c",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/register/teacher:1:19",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 136) [عالٍ (High)] واجهة — جديد — ×3
id: d0c864df-4a99-43ca-a163-477a72848b84
الرسالة: undefined is not an object (evaluating 'window.__firefox__.reader')
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:39:40.390485+00:00
أول تسجيل: 2026-08-23T17:38:18.804648+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63du0m_9384233ab674
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt63du0m_9384233ab674",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:19",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 137) [عالٍ (High)] واجهة — جديد — ×3
id: 238ccdf7-0a77-4cf8-99d3-998503e19b3a
الرسالة: Can't find variable: __firefox__
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:39:40.382619+00:00
أول تسجيل: 2026-08-23T17:38:18.896435+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63du0s_5a40fad6320b
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/login/staff:1:12
Context:
{
  "os": "macOS",
  "colno": 12,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "ReferenceError",
  "request_id": "r_mt63du0s_5a40fad6320b",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:12",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 138) [عالٍ (High)] واجهة — جديد — ×2
id: 94a646d3-5851-40a3-a790-1ae38697d54c
الرسالة: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:39:39.544508+00:00
أول تسجيل: 2026-08-23T17:38:18.863823+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63du0x_5d2c203d08d3
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:16
Context:
{
  "os": "macOS",
  "colno": 16,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt63du0x_5d2c203d08d3",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:16",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 139) [عالٍ (High)] واجهة — جديد
id: 332ab235-bb32-462d-924f-ad272e896ad3
الرسالة: Can't find variable: DarkReader
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:39:39.536554+00:00
أول تسجيل: 2026-08-23T17:39:39.536554+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63du0p_05d1c5850a04
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
global code@https://northelite.tech/login/staff:1:11
Context:
{
  "os": "macOS",
  "colno": 11,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "ReferenceError",
  "request_id": "r_mt63du0p_05d1c5850a04",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:11",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 140) [عالٍ (High)] واجهة — جديد
id: e5623c94-371b-4149-ba92-ce5f29374e5f
الرسالة: undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_FB19952771CF494FBC2496306D2F8374')
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:39:39.535956+00:00
أول تسجيل: 2026-08-23T17:39:39.535956+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63du0n_c98dafe9cc1b
Possible Cause: عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.
Stack:
global code@https://northelite.tech/login/staff:1:19
Context:
{
  "os": "macOS",
  "colno": 19,
  "lineno": 1,
  "browser": "Safari",
  "filename": "https://northelite.tech/login/staff",
  "error_name": "TypeError",
  "request_id": "r_mt63du0n_c98dafe9cc1b",
  "device_type": "mobile",
  "stack_short": "global code@https://northelite.tech/login/staff:1:19",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة."
}

---

## 141) [متوسط (Medium)] واجهة — جديد
id: 550feb14-f38f-4028-9495-c365311bf3a2
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-23T17:38:18.909248+00:00
أول تسجيل: 2026-08-23T17:38:18.909248+00:00
Correlation: c_mt63c3dr_mdi4modb
Request ID: r_mt63c3dv_6ed16de4d93c
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "macOS",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Safari",
  "request_id": "r_mt63c3dv_6ed16de4d93c",
  "device_type": "mobile",
  "correlation_id": "c_mt63c3dr_mdi4modb",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 142) [متوسط (Medium)] API — جديد
id: 76736995-8405-4892-9375-621679bca170
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-23T09:49:43.0102+00:00
أول تسجيل: 2026-08-23T09:49:43.0102+00:00
Correlation: c_mt5mlha6_eolassjc
Request ID: r_mt5mlhaa_9c9e843090ab
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt5mlhaa_9c9e843090ab",
  "device_type": "mobile",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt5mlha6_eolassjc",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 143) [متوسط (Medium)] API — جديد — ×2
id: 28e69547-721e-403a-9941-fdb92b0b60de
الرسالة: HTTP 400 POST /storage/v1/object/school-media/classes/%D8%A7%D9%84%D8%A3%D9%88%D9%84%20%D8%A7%D9%84%D9%85%D8%AA%D9%88%D8%B3%D8%B7/%D8%A3.jpg
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /display/leaderboard
URL: http://localhost:5173/display/leaderboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-21T19:32:39.517695+00:00
أول تسجيل: 2026-08-21T19:31:15.317364+00:00
Correlation: c_mt3chn70_n4ft7c55
Request ID: r_mt3cjgbz_71c11678fa0a
Possible Cause: مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات.
HTTP: POST /storage/v1/object/school-media/classes/%D8%A7%D9%84%D8%A3%D9%88%D9%84%20%D8%A7%D9%84%D9%85%D8%AA%D9%88%D8%B3%D8%B7/%D8%A3.jpg → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/storage/v1/object/school-media/classes/%D8%A7%D9%84%D8%A3%D9%88%D9%84%20%D8%A7%D9%84%D9%85%D8%AA%D9%88%D8%B3%D8%B7/%D8%A3.jpg",
  "request_id": "r_mt3cjgbz_71c11678fa0a",
  "device_type": "desktop",
  "response_body": "{\"statusCode\":\"400\",\"error\":\"InvalidKey\",\"message\":\"Invalid key: classes/الأول المتوسط/أ.jpg\",\"code\":\"InvalidKey\"}",
  "correlation_id": "c_mt3chn70_n4ft7c55",
  "possible_cause": "مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات."
}

---

## 144) [عالٍ (High)] API — جديد
id: 91640f77-242f-4fb2-b0e8-aff8a37cefd5
الرسالة: Failed to fetch — POST /rest/v1/rpc/display_leaderboard
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /display/leaderboard
URL: http://localhost:5173/display/leaderboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-21T19:08:06.377583+00:00
أول تسجيل: 2026-08-21T19:08:06.377583+00:00
Correlation: c_mt3bj9ut_d2w3x3a7
Request ID: r_mt3bn6qn_ea7ad440959d
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/display_leaderboard
Stack:
TypeError: Failed to fetch
    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts:417:22)
    at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=fc6f3d0a:21303:22
    at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=fc6f3d0a:21328:10
    at async executeWithRetry (http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=fc6f3d0a:671:14)
    at async fetchDisplayLeaderboard (http://localhost:5173/src/lib/leaderboardDisplay.ts:9:26)
Context:
{
  "os": "Linux",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/display_leaderboard",
  "error_name": "TypeError",
  "request_id": "r_mt3bn6qn_ea7ad440959d",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts:417:22)\n    at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=fc6f3d0a:21303:22\n    at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=fc6f3d0a:21328:10\n    at async executeWithRetry (http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=fc6f3d0a:671:14)\n    at async fetchDisplayLeaderboard (http://localhost:5173/src/lib/leaderboardDisplay.ts:9:26)",
  "correlation_id": "c_mt3bj9ut_d2w3x3a7",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 145) [متوسط (Medium)] API — جديد
id: 5d49ce98-f7e1-408a-ba60-38c9ccedfab5
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /
URL: http://localhost:5173/login
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-21T18:47:45.529074+00:00
أول تسجيل: 2026-08-21T18:47:45.529074+00:00
Correlation: c_mt3axp9i_3yprh53h
Request ID: r_mt3axp9j_970f4d70f685
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt3axp9j_970f4d70f685",
  "device_type": "desktop",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt3axp9i_3yprh53h",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 146) [متوسط (Medium)] واجهة — جديد
id: 7a804679-cbe0-42af-82f4-1831a5b0a4b3
الرسالة: Could not find the table 'public.attendance_class_sessions' in the schema cache
المستخدم: عمرو مجدي | الدور: deputy | الجوال: غير مسجّل
المسار: /academic/attendance
URL: https://northelite.tech/academic/attendance
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:52:39.277659+00:00
أول تسجيل: 2026-08-21T17:52:39.277659+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38ytdu_067ec8b58d2c
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "deputy-attendance-day-status",
    "middle",
    "2026-08-21"
  ],
  "error_name": "PGRST205",
  "request_id": "r_mt38ytdu_067ec8b58d2c",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 147) [منخفض (Low)] API — جديد
id: fe167259-084c-4f3b-a92a-4eba85902d75
الرسالة: HTTP 404 GET /rest/v1/attendance_class_sessions
المستخدم: عمرو مجدي | الدور: deputy | الجوال: غير مسجّل
المسار: /academic/attendance
URL: https://northelite.tech/academic/attendance
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:52:38.079901+00:00
أول تسجيل: 2026-08-21T17:52:38.079901+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38ysgt_bb2c7f4fcd3e
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: GET /rest/v1/attendance_class_sessions → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&attendance_date=eq.2026-08-21&order=grade.asc&education_level=eq.middle",
  "method": "GET",
  "params": {
    "order": "grade.asc",
    "select": "*",
    "attendance_date": "eq.2026-08-21",
    "education_level": "eq.middle"
  },
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/attendance_class_sessions",
  "request_id": "r_mt38ysgt_bb2c7f4fcd3e",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST205\",\"details\":null,\"hint\":null,\"message\":\"Could not find the table 'public.attendance_class_sessions' in the schema cache\"}",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 148) [متوسط (Medium)] واجهة — جديد
id: 9de82868-afd6-4938-a50f-78949f0f4712
الرسالة: A user with this email address has already been registered | احتياطي invoke: A user with this email address has already been registered
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:50:28.920704+00:00
أول تسجيل: 2026-08-21T17:50:28.920704+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38w0sf_d6964af46393
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: A user with this email address has already been registered | احتياطي invoke: A user with this email address has already been registered
    at Xm (https://northelite.tech/assets/index-C7K9lhD0.js:213:67504)
    at async Object.mutationFn (https://northelite.tech/assets/index-C7K9lhD0.js:419:67071)
Context:
{
  "os": "Android",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt38w0sf_d6964af46393",
  "device_type": "mobile",
  "stack_short": "Error: A user with this email address has already been registered | احتياطي invoke: A user with this email address has already been registered\n    at Xm (https://northelite.tech/assets/index-C7K9lhD0.js:213:67504)\n    at async Object.mutationFn (https://northelite.tech/assets/index-C7K9lhD0.js:419:67071)",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 149) [متوسط (Medium)] Edge — جديد
id: 8edaadde-403b-46ef-8c58-3aae157c1368
الرسالة: HTTP 400 POST /functions/v1/create-user
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:50:26.770137+00:00
أول تسجيل: 2026-08-21T17:50:26.770137+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38vz40_73db30906f57
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/create-user → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/create-user",
  "request_id": "r_mt38vz40_73db30906f57",
  "device_type": "mobile",
  "response_body": "{\"error\":\"A user with this email address has already been registered\"}",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 150) [متوسط (Medium)] واجهة — جديد
id: ef4e631c-68e8-4322-b4d8-da929ce72833
الرسالة: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:45:34.298971+00:00
أول تسجيل: 2026-08-21T17:45:34.298971+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38ppff_d51d5e348b6a
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "Android",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt38ppff_d51d5e348b6a",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 151) [متوسط (Medium)] واجهة — جديد
id: d530c9ac-fd51-4fd5-b52d-425ad621d431
الرسالة: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:45:34.260135+00:00
أول تسجيل: 2026-08-21T17:45:34.260135+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38ppfb_7c99ec9c9cb3
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.
    at eh (https://northelite.tech/assets/index-BgS6fu_-.js:213:67139)
    at async Object.mutationFn (https://northelite.tech/assets/index-BgS6fu_-.js:419:96834)
Context:
{
  "os": "Android",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt38ppfb_7c99ec9c9cb3",
  "device_type": "mobile",
  "stack_short": "Error: تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.\n    at eh (https://northelite.tech/assets/index-BgS6fu_-.js:213:67139)\n    at async Object.mutationFn (https://northelite.tech/assets/index-BgS6fu_-.js:419:96834)",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 152) [متوسط (Medium)] API — جديد
id: 121788b2-8fba-4c83-8739-81a51b533d5f
الرسالة: HTTP 409 DELETE /rest/v1/users
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:45:34.249604+00:00
أول تسجيل: 2026-08-21T17:45:34.249604+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38ppf3_015693f604b0
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: DELETE /rest/v1/users → 409
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?id=eq.beb28c9e-10dc-46ba-9846-906eb727e4a8",
  "method": "DELETE",
  "params": {
    "id": "eq.beb28c9e-10dc-46ba-9846-906eb727e4a8"
  },
  "status": 409,
  "browser": "Chrome",
  "endpoint": "/rest/v1/users",
  "request_id": "r_mt38ppf3_015693f604b0",
  "device_type": "mobile",
  "response_body": "{\"code\":\"23503\",\"details\":\"Key is still referenced from table \\\"academic_observation_reports\\\".\",\"hint\":null,\"message\":\"update or delete on table \\\"users\\\" violates foreign key constraint \\\"academic_observation_reports_requested_by_fkey\\\" on table \\\"academic_observation_reports\\\"\"}",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 153) [عالٍ (High)] Edge — جديد
id: 4611fd94-1450-4059-99c9-f50aa97d092d
الرسالة: HTTP 500 POST /functions/v1/delete-user
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:45:33.977085+00:00
أول تسجيل: 2026-08-21T17:45:33.977085+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38po3h_e921ab0760e9
Possible Cause: عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط.
HTTP: POST /functions/v1/delete-user → 500
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 500,
  "browser": "Chrome",
  "endpoint": "/functions/v1/delete-user",
  "request_id": "r_mt38po3h_e921ab0760e9",
  "device_type": "mobile",
  "response_body": "{\"error\":\"{}\"}",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط."
}

---

## 154) [عالٍ (High)] API — جديد
id: 8579b519-fc4b-41c7-a32b-77907fa80c86
الرسالة: Failed to fetch — POST /functions/v1/delete-user
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /principal/users
URL: https://northelite.tech/principal/users
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:45:18.945722+00:00
أول تسجيل: 2026-08-21T17:45:18.945722+00:00
Correlation: c_mt38pdi0_nrvxttp9
Request ID: r_mt38pdc6_93f25e2d4775
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/delete-user
Stack:
TypeError: Failed to fetch
    at Ja.window.fetch (https://northelite.tech/assets/index-BgS6fu_-.js:34:13367)
    at Bhe.window.fetch (https://northelite.tech/assets/index-BgS6fu_-.js:282:77706)
    at https://northelite.tech/assets/index-BgS6fu_-.js:32:48325
    at https://northelite.tech/assets/index-BgS6fu_-.js:32:48849
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/functions/v1/delete-user",
  "error_name": "TypeError",
  "request_id": "r_mt38pdc6_93f25e2d4775",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ja.window.fetch (https://northelite.tech/assets/index-BgS6fu_-.js:34:13367)\n    at Bhe.window.fetch (https://northelite.tech/assets/index-BgS6fu_-.js:282:77706)\n    at https://northelite.tech/assets/index-BgS6fu_-.js:32:48325\n    at https://northelite.tech/assets/index-BgS6fu_-.js:32:48849",
  "correlation_id": "c_mt38pdi0_nrvxttp9",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 155) [متوسط (Medium)] واجهة — جديد
id: 00db3f0d-8b51-4b32-aa37-65e2b716bdaa
الرسالة: فشل تحميل مورد: https://www.clarity.ms/tag/xxrcpnz5j0?ref=npm
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:17:26.07731+00:00
أول تسجيل: 2026-08-21T17:17:26.07731+00:00
Correlation: c_mt37igkt_3zsaw9p8
Request ID: r_mt37pift_7e8190b64d9f
Possible Cause: فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.
Context:
{
  "os": "Android",
  "tag": "SCRIPT",
  "type": "resource_error",
  "browser": "Chrome",
  "request_id": "r_mt37pift_7e8190b64d9f",
  "device_type": "mobile",
  "correlation_id": "c_mt37igkt_3zsaw9p8",
  "possible_cause": "فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN."
}

---

## 156) [متوسط (Medium)] Edge — جديد
id: b57e6dbc-68e1-46f2-bbee-81e883a396da
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:14:56.887683+00:00
أول تسجيل: 2026-08-21T17:14:56.887683+00:00
Correlation: c_mt37igkt_3zsaw9p8
Request ID: r_mt37mbnr_79bae9c6099c
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt37mbnr_79bae9c6099c",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».\",\"not_registered\":true}",
  "correlation_id": "c_mt37igkt_3zsaw9p8",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 157) [منخفض (Low)] Edge — جديد
id: 36b525ca-092b-481a-8ec4-08e91692ac95
الرسالة: HTTP 404 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T17:11:56.905811+00:00
أول تسجيل: 2026-08-21T17:11:56.905811+00:00
Correlation: c_mt37igkt_3zsaw9p8
Request ID: r_mt37igkt_52f5b0b0c26b
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /functions/v1/auth-phone-otp → 404
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt37igkt_52f5b0b0c26b",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».\",\"not_registered\":true}",
  "correlation_id": "c_mt37igkt_3zsaw9p8",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 158) [عالٍ (High)] واجهة — جديد — ×2
id: 1efeb403-83ae-4e06-b67a-66c974981eeb
الرسالة: Script error.
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: https://northelite.tech/login/staff
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-21T16:56:13.863365+00:00
أول تسجيل: 2026-08-21T16:54:52.465713+00:00
Correlation: c_mt36wj2z_juxbhdvc
Request ID: r_mt36y9gz_4a47b87029e4
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "os": "macOS",
  "colno": 0,
  "lineno": 0,
  "browser": "Safari",
  "filename": "",
  "error_name": "Error",
  "request_id": "r_mt36y9gz_4a47b87029e4",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt36y9gz_su9qrndk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 159) [متوسط (Medium)] واجهة — جديد
id: 342699eb-c72f-4e34-8046-fc1125995995
الرسالة: يجب تسجيل الدخول لعرض الإشعارات
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Safari · macOS · mobile
آخر ظهور: 2026-08-21T16:55:14.168759+00:00
أول تسجيل: 2026-08-21T16:55:14.168759+00:00
Correlation: c_mt36wzxa_p5xudmen
Request ID: r_mt36wzxa_47dd10a7c6a6
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
hC@https://northelite.tech/assets/index-BLJkveZL.js:278:31656
Context:
{
  "os": "macOS",
  "kind": "query",
  "type": "react_query",
  "browser": "Safari",
  "queryKey": [
    "notifications",
    "unread-count",
    "88cba29a-29bb-41f8-a332-01d2ee1fc5d8"
  ],
  "error_name": "Error",
  "request_id": "r_mt36wzxa_47dd10a7c6a6",
  "device_type": "mobile",
  "stack_short": "hC@https://northelite.tech/assets/index-BLJkveZL.js:278:31656",
  "correlation_id": "c_mt36wzxa_p5xudmen",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 160) [عالٍ (High)] Edge — جديد — ×4
id: adfd80b6-4aa5-4f40-bcd4-8fc7e6123960
الرسالة: HTTP 500 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T14:45:40.533225+00:00
أول تسجيل: 2026-08-21T14:42:49.398742+00:00
Correlation: c_mt326ouf_cjh371pa
Request ID: r_mt32ac5s_646bb760b6db
Possible Cause: عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط.
HTTP: POST /functions/v1/auth-phone-otp → 500
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 500,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt32ac5s_646bb760b6db",
  "device_type": "mobile",
  "response_body": "{\"error\":\"A user with this email address has already been registered\"}",
  "correlation_id": "c_mt326ouf_cjh371pa",
  "possible_cause": "عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط."
}

---

## 161) [متوسط (Medium)] Edge — جديد
id: d7a30e33-1a57-4421-a7e6-563811ea613a
الرسالة: HTTP 429 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T14:44:58.30047+00:00
أول تسجيل: 2026-08-21T14:44:58.30047+00:00
Correlation: c_mt326ouf_cjh371pa
Request ID: r_mt329gcf_6b9a19ffe89b
Possible Cause: تم تجاوز حد الطلبات — خفّف الإرسال أو ارفع الحصة.
HTTP: POST /functions/v1/auth-phone-otp → 429
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 429,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt329gcf_6b9a19ffe89b",
  "device_type": "mobile",
  "response_body": "{\"error\":\"انتظر دقيقة قبل طلب رمز جديد\"}",
  "correlation_id": "c_mt326ouf_cjh371pa",
  "possible_cause": "تم تجاوز حد الطلبات — خفّف الإرسال أو ارفع الحصة."
}

---

## 162) [متوسط (Medium)] Edge — جديد
id: 06a26726-dc61-4f1d-a793-f3e8e25ce354
الرسالة: HTTP 409 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-21T14:44:50.773911+00:00
أول تسجيل: 2026-08-21T14:44:50.773911+00:00
Correlation: c_mt326ouf_cjh371pa
Request ID: r_mt329akv_05cb3fd19cc4
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: POST /functions/v1/auth-phone-otp → 409
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 409,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt329akv_05cb3fd19cc4",
  "device_type": "mobile",
  "response_body": "{\"error\":\"هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول\"}",
  "correlation_id": "c_mt326ouf_cjh371pa",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 163) [متوسط (Medium)] واجهة — جديد — ×5
id: 83b7bdcd-2423-45be-bfe8-b01d35a58771
الرسالة: column exams.starts_at does not exist
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: http://localhost:5173/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:51:13.827864+00:00
أول تسجيل: 2026-08-20T13:31:19.64511+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1kwito_5e1ea299641f
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Linux",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_mt1kwito_5e1ea299641f",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt1kbmtt_h2mvzh9v",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 164) [متوسط (Medium)] API — جديد — ×5
id: 840b1fd7-8b74-44cd-b120-68dca07f494d
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: http://localhost:5173/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:51:12.762621+00:00
أول تسجيل: 2026-08-20T13:31:18.522314+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1kwhu1_92861d2d0d74
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_mt1kwhu1_92861d2d0d74",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_mt1kbmtt_h2mvzh9v",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 165) [متوسط (Medium)] واجهة — جديد
id: f9fd5954-a9ac-4a84-8f8e-151e15f926e2
الرسالة: تجاوزت الحد الأسبوعي للمنح. المتبقي: 9 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /card/t/56afdefabd8a31e87add561ae2e70d1d
URL: https://northelite.tech/card/t/56afdefabd8a31e87add561ae2e70d1d
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:50:47.936751+00:00
أول تسجيل: 2026-08-20T13:50:47.936751+00:00
Correlation: c_mt1kvuwv_bud6squr
Request ID: r_mt1kvy0r_f6bce56698cb
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 9 نقطة
    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)
Context:
{
  "os": "Android",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1kvy0r_f6bce56698cb",
  "user_phone": "054364099",
  "device_type": "mobile",
  "stack_short": "Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 9 نقطة\n    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)",
  "correlation_id": "c_mt1kvuwv_bud6squr",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 166) [متوسط (Medium)] واجهة — جديد
id: 30802c5e-865b-4431-bf2f-527d95606b84
الرسالة: تجاوزت الحد الأسبوعي للمنح. المتبقي: 9 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /card/t/56afdefabd8a31e87add561ae2e70d1d
URL: https://northelite.tech/card/t/56afdefabd8a31e87add561ae2e70d1d
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:50:47.933047+00:00
أول تسجيل: 2026-08-20T13:50:47.933047+00:00
Correlation: c_mt1kvuwv_bud6squr
Request ID: r_mt1kvy0q_2a448fad49c8
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 9 نقطة
    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)
Context:
{
  "os": "Android",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1kvy0q_2a448fad49c8",
  "user_phone": "054364099",
  "device_type": "mobile",
  "stack_short": "Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 9 نقطة\n    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)",
  "correlation_id": "c_mt1kvuwv_bud6squr",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 167) [متوسط (Medium)] واجهة — جديد
id: 6fe58c32-c0a0-4b64-a5ad-b2c3e589a3cc
الرسالة: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /card/t/56afdefabd8a31e87add561ae2e70d1d
URL: https://northelite.tech/card/t/56afdefabd8a31e87add561ae2e70d1d
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:50:44.018195+00:00
أول تسجيل: 2026-08-20T13:50:44.018195+00:00
Correlation: c_mt1kvuwv_bud6squr
Request ID: r_mt1kvux8_cc98ba8fa0d0
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة
    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)
Context:
{
  "os": "Android",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1kvux8_cc98ba8fa0d0",
  "user_phone": "054364099",
  "device_type": "mobile",
  "stack_short": "Error: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة\n    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)",
  "correlation_id": "c_mt1kvuwv_bud6squr",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 168) [متوسط (Medium)] واجهة — جديد
id: 7be4b917-9302-41be-98b0-a6b0e1d54937
الرسالة: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /card/t/56afdefabd8a31e87add561ae2e70d1d
URL: https://northelite.tech/card/t/56afdefabd8a31e87add561ae2e70d1d
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:50:44.016802+00:00
أول تسجيل: 2026-08-20T13:50:44.016802+00:00
Correlation: c_mt1kvuwv_bud6squr
Request ID: r_mt1kvuxa_2a6aaa1f5774
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة
    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)
Context:
{
  "os": "Android",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1kvuxa_2a6aaa1f5774",
  "user_phone": "054364099",
  "device_type": "mobile",
  "stack_short": "Error: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة\n    at Object.mutationFn (https://northelite.tech/assets/index-BC5FSMTg.js:1213:25677)",
  "correlation_id": "c_mt1kvuwv_bud6squr",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 169) [متوسط (Medium)] API — جديد
id: 23085237-0fce-46c9-a705-01296b7fe859
الرسالة: HTTP 400 POST /rest/v1/points_ledger
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /card/t/56afdefabd8a31e87add561ae2e70d1d
URL: https://northelite.tech/card/t/56afdefabd8a31e87add561ae2e70d1d
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:50:43.974062+00:00
أول تسجيل: 2026-08-20T13:50:43.974062+00:00
Correlation: c_mt1kvuwv_bud6squr
Request ID: r_mt1kvuwv_17dc309b811e
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/points_ledger → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?columns=\"student_id\",\"granted_by\",\"activity_id\",\"points\",\"note\",\"status\",\"approved_by\",\"approved_at\",\"first_approved_by\",\"first_approved_at\",\"rejection_reason\",\"academic_year\"",
  "method": "POST",
  "params": {
    "columns": "\"student_id\",\"granted_by\",\"activity_id\",\"points\",\"note\",\"status\",\"approved_by\",\"approved_at\",\"first_approved_by\",\"first_approved_at\",\"rejection_reason\",\"academic_year\""
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/points_ledger",
  "request_id": "r_mt1kvuwv_17dc309b811e",
  "user_phone": "054364099",
  "device_type": "mobile",
  "response_body": "{\"code\":\"P0001\",\"details\":null,\"hint\":null,\"message\":\"INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي: 18 نقطة\"}",
  "correlation_id": "c_mt1kvuwv_bud6squr",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 170) [عالٍ (High)] واجهة — جديد — ×2
id: de3f01d1-9eef-4967-a16b-c332adb904cd
الرسالة: Cannot read properties of undefined (reading 'length')
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 0543641209
المسار: /card/7d74e2d8-c5f1-4521-9987-36a6deb95382
URL: http://localhost:5173/card/7d74e2d8-c5f1-4521-9987-36a6deb95382
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:46:20.37037+00:00
أول تسجيل: 2026-08-20T13:42:56.727742+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1kq7wc_43fbb3c3721b
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
TypeError: Cannot read properties of undefined (reading 'length')
    at StudentCardPage (http://localhost:5173/src/components/shared/StudentCardPage.tsx?t=1787233578549:222:22)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:12868:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:4213:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:5569:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:6140:20)
Context:
{
  "os": "Linux",
  "kind": "route-error",
  "type": "route-error",
  "browser": "Chrome",
  "request_id": "r_mt1kq7wc_43fbb3c3721b",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Cannot read properties of undefined (reading 'length')\n    at StudentCardPage (http://localhost:5173/src/components/shared/StudentCardPage.tsx?t=1787233578549:222:22)\n    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:12868:12)\n    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:4213:19)\n    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:5569:16)\n    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=77cb1254:6140:20)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 171) [متوسط (Medium)] واجهة — جديد — ×4
id: cf43db84-d583-4d4e-b311-49412ebd9f51
الرسالة: Cannot coerce the result to a single JSON object
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /card/7d74e2d8-c5f1-4521-9987-36a6deb95382
URL: https://northelite.tech/card/7d74e2d8-c5f1-4521-9987-36a6deb95382
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:40:13.283074+00:00
أول تسجيل: 2026-08-20T13:36:08.190119+00:00
Correlation: c_mt1kd1xl_qh8o4284
Request ID: r_mt1kicb8_5bd00121f075
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "public",
    "student",
    "card",
    "7d74e2d8-c5f1-4521-9987-36a6deb95382",
    null
  ],
  "error_name": "PGRST116",
  "request_id": "r_mt1kicb8_5bd00121f075",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_mt1kd1xl_qh8o4284",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 172) [متوسط (Medium)] API — جديد — ×4
id: e6a32ef9-337e-407e-ba9f-a6f4f7a01cc4
الرسالة: HTTP 406 GET /rest/v1/students
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /card/7d74e2d8-c5f1-4521-9987-36a6deb95382
URL: https://northelite.tech/card/7d74e2d8-c5f1-4521-9987-36a6deb95382
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T13:40:12.00421+00:00
أول تسجيل: 2026-08-20T13:36:06.938598+00:00
Correlation: c_mt1kd1xl_qh8o4284
Request ID: r_mt1kibbj_dfe9da58951d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/students → 406
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&id=eq.7d74e2d8-c5f1-4521-9987-36a6deb95382",
  "method": "GET",
  "params": {
    "id": "eq.7d74e2d8-c5f1-4521-9987-36a6deb95382",
    "select": "*"
  },
  "status": 406,
  "browser": "Chrome",
  "endpoint": "/rest/v1/students",
  "request_id": "r_mt1kibbj_dfe9da58951d",
  "device_type": "mobile",
  "response_body": "{\"code\":\"PGRST116\",\"details\":\"The result contains 0 rows\",\"hint\":null,\"message\":\"Cannot coerce the result to a single JSON object\"}",
  "correlation_id": "c_mt1kd1xl_qh8o4284",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 173) [متوسط (Medium)] API — جديد — ×3
id: f97b4164-628a-4f57-8b63-d8371510f031
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: http://localhost:5173/login
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:36:06.698654+00:00
أول تسجيل: 2026-08-20T13:31:06.937495+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1kd1xl_e9ddbf80c374
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt1kd1xl_e9ddbf80c374",
  "device_type": "mobile",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt1kd1xl_qh8o4284",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 174) [متوسط (Medium)] واجهة — جديد — ×2
id: 3132f2b5-2c03-4e4e-885b-327b71bd215b
الرسالة: فشل رفع الملف إلى الاستضافة (HTTP_200)
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:23:43.644987+00:00
أول تسجيل: 2026-08-20T13:20:48.397534+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jx5ie_f7f1e743d556
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: فشل رفع الملف إلى الاستضافة (HTTP_200)
    at postToHostinger (http://localhost:5173/src/lib/hostingerUpload.ts?t=1787231976377:58:9)
    at async uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts?t=1787231976377:18:20)
    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787232126323:255:25)
Context:
{
  "os": "Linux",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jx5ie_f7f1e743d556",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: فشل رفع الملف إلى الاستضافة (HTTP_200)\n    at postToHostinger (http://localhost:5173/src/lib/hostingerUpload.ts?t=1787231976377:58:9)\n    at async uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts?t=1787231976377:18:20)\n    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787232126323:255:25)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 175) [متوسط (Medium)] واجهة — جديد — ×2
id: 738ffe3d-23e5-47c8-bc4d-2a8ff2ea57d3
الرسالة: فشل رفع الملف إلى الاستضافة (HTTP_200)
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:23:43.644147+00:00
أول تسجيل: 2026-08-20T13:20:48.408757+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jx5id_d112f3ebc5cf
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: فشل رفع الملف إلى الاستضافة (HTTP_200)
    at postToHostinger (http://localhost:5173/src/lib/hostingerUpload.ts?t=1787231976377:58:9)
    at async uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts?t=1787231976377:18:20)
    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787232126323:255:25)
Context:
{
  "os": "Linux",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jx5id_d112f3ebc5cf",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: فشل رفع الملف إلى الاستضافة (HTTP_200)\n    at postToHostinger (http://localhost:5173/src/lib/hostingerUpload.ts?t=1787231976377:58:9)\n    at async uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts?t=1787231976377:18:20)\n    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787232126323:255:25)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 176) [متوسط (Medium)] واجهة — جديد — ×2
id: fb209425-3fd4-47f7-9308-a934731f1720
الرسالة: Bucket not found
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:18:54.28846+00:00
أول تسجيل: 2026-08-20T13:16:59.600741+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jqy7n_eac82d32e554
Possible Cause: مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات.
Stack:
Error: Bucket not found
    at uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts:38:20)
    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231806581:254:25)
Context:
{
  "os": "Linux",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jqy7n_eac82d32e554",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: Bucket not found\n    at uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts:38:20)\n    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231806581:254:25)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات."
}

---

## 177) [متوسط (Medium)] API — جديد
id: 9c406e55-68cf-4c97-b74f-b73b17f2b222
الرسالة: HTTP 400 POST /storage/v1/object/points-evidence/b80d9685-a729-4954-9a11-f3fe37ac7b59/1787231933710-school-logo.jpeg
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:18:54.287644+00:00
أول تسجيل: 2026-08-20T13:18:54.287644+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jqy7l_afcac59f2542
Possible Cause: مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات.
HTTP: POST /storage/v1/object/points-evidence/b80d9685-a729-4954-9a11-f3fe37ac7b59/1787231933710-school-logo.jpeg → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/storage/v1/object/points-evidence/b80d9685-a729-4954-9a11-f3fe37ac7b59/1787231933710-school-logo.jpeg",
  "request_id": "r_mt1jqy7l_afcac59f2542",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"statusCode\":\"404\",\"error\":\"Bucket not found\",\"message\":\"Bucket not found\",\"code\":\"NoSuchBucket\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات."
}

---

## 178) [متوسط (Medium)] واجهة — جديد — ×2
id: c2a97de2-312d-4036-9b75-ac0346dcb0d8
الرسالة: Bucket not found
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:18:54.263081+00:00
أول تسجيل: 2026-08-20T13:16:59.63064+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jqy7m_f684541ff635
Possible Cause: مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات.
Stack:
Error: Bucket not found
    at uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts:38:20)
    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231806581:254:25)
Context:
{
  "os": "Linux",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jqy7m_f684541ff635",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: Bucket not found\n    at uploadPointsEvidenceFiles (http://localhost:5173/src/lib/pointsEvidence.ts:38:20)\n    at async Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231806581:254:25)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات."
}

---

## 179) [متوسط (Medium)] API — جديد
id: e9d8f10c-7532-4b49-9819-2867147c3cf9
الرسالة: HTTP 400 POST /storage/v1/object/points-evidence/b80d9685-a729-4954-9a11-f3fe37ac7b59/1787231818850-school-logo.jpeg
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:16:59.601504+00:00
أول تسجيل: 2026-08-20T13:16:59.601504+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1johq5_52e3c74665b4
Possible Cause: مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات.
HTTP: POST /storage/v1/object/points-evidence/b80d9685-a729-4954-9a11-f3fe37ac7b59/1787231818850-school-logo.jpeg → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/storage/v1/object/points-evidence/b80d9685-a729-4954-9a11-f3fe37ac7b59/1787231818850-school-logo.jpeg",
  "request_id": "r_mt1johq5_52e3c74665b4",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"statusCode\":\"404\",\"error\":\"Bucket not found\",\"message\":\"Bucket not found\",\"code\":\"NoSuchBucket\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات."
}

---

## 180) [متوسط (Medium)] واجهة — جديد
id: 82e3c6bb-8b13-4a45-afcc-76bfb2682e46
الرسالة: تجاوزت الحد الأسبوعي للمنح. المتبقي: 11 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:15:16.431322+00:00
أول تسجيل: 2026-08-20T13:15:16.431322+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jm9yc_a2939782c4e4
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 11 نقطة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)
Context:
{
  "os": "Linux",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jm9yc_a2939782c4e4",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 11 نقطة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 181) [متوسط (Medium)] واجهة — جديد
id: b1f02bd9-1ab2-4424-8a43-1c0faef32710
الرسالة: تجاوزت الحد الأسبوعي للمنح. المتبقي: 11 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:15:16.43067+00:00
أول تسجيل: 2026-08-20T13:15:16.43067+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jm9y2_97db77adf71f
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 11 نقطة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)
Context:
{
  "os": "Linux",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jm9y2_97db77adf71f",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 11 نقطة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 182) [متوسط (Medium)] API — جديد
id: 72e923f2-8ec4-4e63-8db7-a1666fa374af
الرسالة: HTTP 400 POST /rest/v1/points_ledger
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:14:58.183473+00:00
أول تسجيل: 2026-08-20T13:14:58.183473+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jlvrp_9683779f833c
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/points_ledger → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?columns=\"student_id\",\"granted_by\",\"activity_id\",\"points\",\"note\",\"status\",\"approved_by\",\"approved_at\",\"first_approved_by\",\"first_approved_at\",\"rejection_reason\",\"academic_year\"",
  "method": "POST",
  "params": {
    "columns": "\"student_id\",\"granted_by\",\"activity_id\",\"points\",\"note\",\"status\",\"approved_by\",\"approved_at\",\"first_approved_by\",\"first_approved_at\",\"rejection_reason\",\"academic_year\""
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/points_ledger",
  "request_id": "r_mt1jlvrp_9683779f833c",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"code\":\"P0001\",\"details\":null,\"hint\":null,\"message\":\"INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 183) [متوسط (Medium)] واجهة — جديد
id: e0a64f70-5ba6-4104-a069-9df2da4e6466
الرسالة: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:14:58.182724+00:00
أول تسجيل: 2026-08-20T13:14:58.182724+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jlvrs_f2ea222732e9
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)
Context:
{
  "os": "Linux",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jlvrs_f2ea222732e9",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 184) [متوسط (Medium)] واجهة — جديد
id: fdb5ce92-e84e-49be-99ca-f2f1aef15a95
الرسالة: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T13:14:58.150802+00:00
أول تسجيل: 2026-08-20T13:14:58.150802+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1jlvrt_e7baf1d81026
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)
Context:
{
  "os": "Linux",
  "type": "toast_error",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt1jlvrt_e7baf1d81026",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: رصيد النقاط غير كافٍ. المتبقي: 20 نقطة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787231673155:257:21)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 185) [عالٍ (High)] واجهة — جديد — ×2
id: 067d0538-ab07-4cc0-bdd1-ec78f82612d1
الرسالة: DailyOpsInbox is not defined
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /dashboard
URL: http://localhost:5173/dashboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T12:41:30.258988+00:00
أول تسجيل: 2026-08-20T12:41:20.610057+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1ieupz_33474c2ef0f9
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
ReferenceError: DailyOpsInbox is not defined
    at PrincipalDashboard (http://localhost:5173/src/pages/principal/PrincipalDashboard.tsx?t=1787229689200:408:42)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:12868:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:4213:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:5569:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:6140:20)
Context:
{
  "os": "Linux",
  "kind": "route-error",
  "type": "route-error",
  "browser": "Chrome",
  "request_id": "r_mt1ieupz_33474c2ef0f9",
  "device_type": "desktop",
  "stack_short": "ReferenceError: DailyOpsInbox is not defined\n    at PrincipalDashboard (http://localhost:5173/src/pages/principal/PrincipalDashboard.tsx?t=1787229689200:408:42)\n    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:12868:12)\n    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:4213:19)\n    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:5569:16)\n    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:6140:20)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 186) [عالٍ (High)] واجهة — جديد
id: c04f0976-a0d6-4007-a034-3738f1957d0f
الرسالة: attendanceSeries is not defined
المستخدم: محمد نصر الدين مصطفي | الدور: principal | الجوال: غير مسجّل
المسار: /dashboard
URL: http://localhost:5173/dashboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T12:31:38.702567+00:00
أول تسجيل: 2026-08-20T12:31:38.702567+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1i266l_1a50286e657f
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
ReferenceError: attendanceSeries is not defined
    at PrincipalDashboard (http://localhost:5173/src/pages/principal/PrincipalDashboard.tsx?t=1787229094305:388:14)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:12868:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:4213:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:5569:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:6140:20)
Context:
{
  "os": "Linux",
  "kind": "route-error",
  "type": "route-error",
  "browser": "Chrome",
  "request_id": "r_mt1i266l_1a50286e657f",
  "device_type": "desktop",
  "stack_short": "ReferenceError: attendanceSeries is not defined\n    at PrincipalDashboard (http://localhost:5173/src/pages/principal/PrincipalDashboard.tsx?t=1787229094305:388:14)\n    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:12868:12)\n    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:4213:19)\n    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:5569:16)\n    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=e716eab6:6140:20)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 187) [متوسط (Medium)] واجهة — جديد — ×3
id: 5aaf68f3-993d-462d-be2a-fac47ad6de9a
الرسالة: column exams.starts_at does not exist
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: http://localhost:5173/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T12:12:07.956106+00:00
أول تسجيل: 2026-08-20T12:10:02.781759+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1hd2z4_3f6fa354ab1a
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Linux",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_mt1hd2z4_3f6fa354ab1a",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 188) [متوسط (Medium)] API — جديد — ×3
id: 03b33fe9-ef90-4d61-9869-f1b4d6675d7a
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: http://localhost:5173/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T12:12:06.824617+00:00
أول تسجيل: 2026-08-20T12:10:01.756842+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1hd1xj_578f8d9364b2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_mt1hd1xj_578f8d9364b2",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 189) [متوسط (Medium)] Edge — جديد
id: 579d7a37-d80e-4410-ab28-4172aa9b0ed9
الرسالة: HTTP 400 POST /functions/v1/setup-whatsapp-phone
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: غير مسجّل
المسار: /setup-whatsapp
URL: http://localhost:5173/setup-whatsapp
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T12:09:23.760451+00:00
أول تسجيل: 2026-08-20T12:09:23.760451+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1h9k7y_4e0b3a96e169
Possible Cause: واتساب غير متصل أو فشل send-text — راجع /dev/monitor/whatsapp.
HTTP: POST /functions/v1/setup-whatsapp-phone → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/setup-whatsapp-phone",
  "request_id": "r_mt1h9k7y_4e0b3a96e169",
  "device_type": "desktop",
  "response_body": "{\"ok\":false,\"code\":\"NO_WHATSAPP\",\"error\":\"هذا الرقم غير متاح على واتساب\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "واتساب غير متصل أو فشل send-text — راجع /dev/monitor/whatsapp."
}

---

## 190) [متوسط (Medium)] API — جديد
id: 8e45e0d6-a554-488e-a563-d2e823a3e696
الرسالة: HTTP 400 POST /rest/v1/rpc/lookup_student_by_national_id
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: غير مسجّل
المسار: /onboarding
URL: http://localhost:5173/onboarding
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T11:48:25.677319+00:00
أول تسجيل: 2026-08-20T11:48:25.677319+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1giljf_f3754e18eea2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/rpc/lookup_student_by_national_id → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/lookup_student_by_national_id",
  "request_id": "r_mt1giljf_f3754e18eea2",
  "device_type": "desktop",
  "response_body": "{\"code\":\"P0001\",\"details\":null,\"hint\":null,\"message\":\"هذا الطالب مرتبط بحساب آخر مسبقاً\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 191) [متوسط (Medium)] API — جديد — ×2
id: c000023a-9f61-4fab-8c83-33066338014e
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: http://localhost:5173/login
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T11:46:22.09918+00:00
أول تسجيل: 2026-08-20T11:35:38.903789+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1gfy1f_d4ef595ffc5d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=password",
  "method": "POST",
  "params": {
    "grant_type": "password"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt1gfy1f_d4ef595ffc5d",
  "device_type": "desktop",
  "response_body": "{\"code\":\"invalid_credentials\",\"message\":\"Invalid login credentials\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 192) [متوسط (Medium)] Edge — جديد
id: 901d6fc6-10f0-4af8-a740-658b428a9976
الرسالة: HTTP 429 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: http://localhost:5173/login/staff
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T11:43:12.666633+00:00
أول تسجيل: 2026-08-20T11:43:12.666633+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1gbvra_0fe5101d887a
Possible Cause: تم تجاوز حد الطلبات — خفّف الإرسال أو ارفع الحصة.
HTTP: POST /functions/v1/auth-phone-otp → 429
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 429,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt1gbvra_0fe5101d887a",
  "device_type": "desktop",
  "response_body": "{\"error\":\"انتظر دقيقة قبل طلب رمز جديد\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "تم تجاوز حد الطلبات — خفّف الإرسال أو ارفع الحصة."
}

---

## 193) [متوسط (Medium)] Edge — جديد
id: df3f4fc0-7e17-4ab0-921f-67c6a0893d95
الرسالة: HTTP 400 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: http://localhost:5173/register/teacher
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T11:12:52.919025+00:00
أول تسجيل: 2026-08-20T11:12:52.919025+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1f8vnc_2f01d9d1766a
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/auth-phone-otp → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt1f8vnc_2f01d9d1766a",
  "device_type": "desktop",
  "response_body": "{\"error\":\"رمز التحقق غير صحيح\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 194) [متوسط (Medium)] Edge — جديد
id: 358c4813-25d1-46db-b143-3265a2015865
الرسالة: HTTP 409 POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register/teacher
URL: http://localhost:5173/register/teacher
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T11:12:09.886386+00:00
أول تسجيل: 2026-08-20T11:12:09.886386+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1f7ylu_c78ddace33e0
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: POST /functions/v1/auth-phone-otp → 409
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 409,
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "request_id": "r_mt1f7ylu_c78ddace33e0",
  "device_type": "desktop",
  "response_body": "{\"error\":\"هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 195) [عالٍ (High)] API — جديد — ×4
id: b6d3314a-2fff-4e0c-9f1e-76ccd9d1958a
الرسالة: Failed to fetch — POST /functions/v1/auth-phone-otp
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login/staff
URL: http://localhost:5173/login/staff
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T10:50:19.926468+00:00
أول تسجيل: 2026-08-20T10:44:21.964812+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1efva5_2d7da412984b
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/auth-phone-otp
Stack:
TypeError: Failed to fetch
    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts?t=1787222855204:417:22)
    at callAuthPhoneOtp (http://localhost:5173/src/lib/authPhoneOtp.ts?t=1787222819904:20:15)
    at requestTeacherSignupOtp (http://localhost:5173/src/lib/authPhoneOtp.ts?t=1787222819904:83:20)
    at handleRequestPhoneOtp (http://localhost:5173/src/pages/TeacherRegisterPage.tsx?t=1787222855204:73:22)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=7c9e4923:9141:5)
Context:
{
  "os": "Linux",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/functions/v1/auth-phone-otp",
  "error_name": "TypeError",
  "request_id": "r_mt1efva5_2d7da412984b",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts?t=1787222855204:417:22)\n    at callAuthPhoneOtp (http://localhost:5173/src/lib/authPhoneOtp.ts?t=1787222819904:20:15)\n    at requestTeacherSignupOtp (http://localhost:5173/src/lib/authPhoneOtp.ts?t=1787222819904:83:20)\n    at handleRequestPhoneOtp (http://localhost:5173/src/pages/TeacherRegisterPage.tsx?t=1787222855204:73:22)\n    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=7c9e4923:9141:5)",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 196) [متوسط (Medium)] API — جديد
id: 3c05ded4-8cb2-40b2-80ff-ea3d0c0584a5
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /
URL: http://localhost:5173/login
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T09:44:16.824294+00:00
أول تسجيل: 2026-08-20T09:44:16.824294+00:00
Correlation: c_mt1c2xm7_udh404qp
Request ID: r_mt1c2xm8_541d65b22ef1
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt1c2xm8_541d65b22ef1",
  "device_type": "desktop",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt1c2xm7_udh404qp",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 197) [متوسط (Medium)] واجهة — جديد
id: b73376de-91f2-49b9-a34e-3ab54443ccbd
الرسالة: column exams.starts_at does not exist
المستخدم: مصطفي احمد اسم | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T08:30:42.082037+00:00
أول تسجيل: 2026-08-20T08:30:42.082037+00:00
Correlation: c_mt17dz3s_zwm90ava
Request ID: r_mt19gbnl_cc9a43c4c72c
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Linux",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_mt19gbnl_cc9a43c4c72c",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt17dz3s_zwm90ava",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 198) [متوسط (Medium)] API — جديد
id: c8a4427b-df10-4f16-85ff-1a4c5f5aa46f
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: مصطفي احمد اسم | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T08:30:40.90864+00:00
أول تسجيل: 2026-08-20T08:30:40.90864+00:00
Correlation: c_mt17dz3s_zwm90ava
Request ID: r_mt19gaqe_6d00b6e8a64d
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_mt19gaqe_6d00b6e8a64d",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_mt17dz3s_zwm90ava",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 199) [متوسط (Medium)] API — جديد
id: c39ac661-d0ae-4a21-9667-da8d9593fe04
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T08:17:19.787746+00:00
أول تسجيل: 2026-08-20T08:17:19.787746+00:00
Correlation: c_mt18z3oa_4qpycr0m
Request ID: r_mt18z3ob_da465bb6ccb9
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=password",
  "method": "POST",
  "params": {
    "grant_type": "password"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt18z3ob_da465bb6ccb9",
  "device_type": "mobile",
  "response_body": "{\"code\":\"invalid_credentials\",\"message\":\"Invalid login credentials\"}",
  "correlation_id": "c_mt18z3oa_4qpycr0m",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 200) [عالٍ (High)] API — جديد
id: 6fd6bce7-7dab-487f-adf2-3889bcf97c6e
الرسالة: Failed to fetch — GET /rest/v1/points_ledger
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T08:14:12.606868+00:00
أول تسجيل: 2026-08-20T08:14:12.606868+00:00
Correlation: c_mt17sz96_yhqt1e1r
Request ID: r_mt18v3g8_2ae1d77abe93
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/points_ledger
Stack:
TypeError: Failed to fetch
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849
    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950
Context:
{
  "os": "Linux",
  "type": "fetch_network",
  "query": "?select=student_id,created_at&granted_by=eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787&created_at=gte.2026-08-16T21:00:00.000Z&status=in.(pending,approved)",
  "method": "GET",
  "params": {
    "select": "student_id,created_at",
    "status": "in.(pending,approved)",
    "created_at": "gte.2026-08-16T21:00:00.000Z",
    "granted_by": "eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/points_ledger",
  "error_name": "TypeError",
  "request_id": "r_mt18v3g8_2ae1d77abe93",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849\n    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950",
  "correlation_id": "c_mt17sz96_yhqt1e1r",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 201) [عالٍ (High)] API — جديد
id: b06eaf1c-b3cd-4633-89d1-11aee6444fbf
الرسالة: Failed to fetch — GET /rest/v1/points_ledger
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T08:14:12.606219+00:00
أول تسجيل: 2026-08-20T08:14:12.606219+00:00
Correlation: c_mt17sz96_yhqt1e1r
Request ID: r_mt18v3ga_45989643663b
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/points_ledger
Stack:
TypeError: Failed to fetch
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849
    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950
Context:
{
  "os": "Linux",
  "type": "fetch_network",
  "query": "?select=created_at&granted_by=eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787&order=created_at.desc&limit=1",
  "method": "GET",
  "params": {
    "limit": "1",
    "order": "created_at.desc",
    "select": "created_at",
    "granted_by": "eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/points_ledger",
  "error_name": "TypeError",
  "request_id": "r_mt18v3ga_45989643663b",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849\n    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950",
  "correlation_id": "c_mt17sz96_yhqt1e1r",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 202) [عالٍ (High)] API — جديد
id: d86a9281-ba86-431d-91c4-fbb7b2d5a072
الرسالة: Failed to fetch — GET /rest/v1/students
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T08:14:12.601294+00:00
أول تسجيل: 2026-08-20T08:14:12.601294+00:00
Correlation: c_mt17sz96_yhqt1e1r
Request ID: r_mt18v3g7_aeaf7914d21a
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/students
Stack:
TypeError: Failed to fetch
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849
    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950
Context:
{
  "os": "Linux",
  "type": "fetch_network",
  "query": "?select=*&is_active=eq.true",
  "method": "GET",
  "params": {
    "select": "*",
    "is_active": "eq.true"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/students",
  "error_name": "TypeError",
  "request_id": "r_mt18v3g7_aeaf7914d21a",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849\n    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950",
  "correlation_id": "c_mt17sz96_yhqt1e1r",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 203) [عالٍ (High)] API — جديد — ×2
id: 395ced4f-f2db-43f2-ba04-cf53f997799e
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T08:14:12.560858+00:00
أول تسجيل: 2026-08-20T08:07:45.585574+00:00
Correlation: c_mt17sz96_yhqt1e1r
Request ID: r_mt18v3g6_aafd9e1c581c
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325
    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849
    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950
Context:
{
  "os": "Linux",
  "type": "fetch_network",
  "query": "?select=*&user_id=eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787",
  "method": "GET",
  "params": {
    "select": "*",
    "user_id": "eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt18v3g6_aafd9e1c581c",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DZS1Mru7.js:282:75946)\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48325\n    at https://northelite.tech/assets/index-DZS1Mru7.js:32:48849\n    at async https://northelite.tech/assets/index-DZS1Mru7.js:9:42950",
  "correlation_id": "c_mt17sz96_yhqt1e1r",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 204) [منخفض (Low)] API — جديد
id: 0373ea69-8017-4d18-b195-ba12a0b3d28b
الرسالة: HTTP 404 POST /rest/v1/rpc/save_class_weekly_plan_slots
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /academic/weekly-plans
URL: https://northelite.tech/academic/weekly-plans
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T07:50:26.888838+00:00
أول تسجيل: 2026-08-20T07:50:26.888838+00:00
Correlation: c_mt17sz96_yhqt1e1r
Request ID: r_mt180k1e_c8cd60e21528
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/save_class_weekly_plan_slots → 404
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/save_class_weekly_plan_slots",
  "request_id": "r_mt180k1e_c8cd60e21528",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.save_class_weekly_plan_slots with parameters p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.save_class_weekly_plan_slots(p_education_level, p_entries, p_grade, p_section, p_semester, p_week_number) in the schema cache\"}",
  "correlation_id": "c_mt17sz96_yhqt1e1r",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 205) [منخفض (Low)] API — جديد
id: 656ebcbc-2e90-4c1c-8d0a-2562f09e672a
الرسالة: HTTP 404 POST /rest/v1/rpc/academic_notify_homework_class
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /academic/homework
URL: https://northelite.tech/academic/homework
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T07:44:33.352817+00:00
أول تسجيل: 2026-08-20T07:44:33.352817+00:00
Correlation: c_mt17sz96_yhqt1e1r
Request ID: r_mt17sz97_81c3bf4ea425
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /rest/v1/rpc/academic_notify_homework_class → 404
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/academic_notify_homework_class",
  "request_id": "r_mt17sz97_81c3bf4ea425",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.academic_notify_homework_class with parameters p_date, p_grade, p_section, p_subject, p_teacher_name or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.\",\"hint\":null,\"message\":\"Could not find the function public.academic_notify_homework_class(p_date, p_grade, p_section, p_subject, p_teacher_name) in the schema cache\"}",
  "correlation_id": "c_mt17sz96_yhqt1e1r",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 206) [متوسط (Medium)] واجهة — جديد
id: 81926e6d-4612-4fed-85cb-7089276d6d0a
الرسالة: column exams.starts_at does not exist
المستخدم: مصطفي احمد اسم | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T07:34:55.260069+00:00
أول تسجيل: 2026-08-20T07:34:55.260069+00:00
Correlation: c_mt17dz3s_zwm90ava
Request ID: r_mt17gl7h_98cd210808d2
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Linux",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_mt17gl7h_98cd210808d2",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt17dz3s_zwm90ava",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 207) [متوسط (Medium)] API — جديد
id: 611d0c0b-392a-4bea-9891-f28593a60f63
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: مصطفي احمد اسم | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T07:34:54.052316+00:00
أول تسجيل: 2026-08-20T07:34:54.052316+00:00
Correlation: c_mt17dz3s_zwm90ava
Request ID: r_mt17gk9q_b1c71775fef0
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_mt17gk9q_b1c71775fef0",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_mt17dz3s_zwm90ava",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 208) [منخفض (Low)] Edge — جديد
id: 898ca061-b56d-43d6-a1d4-ffb5a94dc785
الرسالة: HTTP 404 POST /functions/v1/student-self-register
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register
URL: https://northelite.tech/register
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T07:32:58.978205+00:00
أول تسجيل: 2026-08-20T07:32:58.978205+00:00
Correlation: c_mt17dz3s_zwm90ava
Request ID: r_mt17e3fx_8102bcd11ff8
Possible Cause: المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.
HTTP: POST /functions/v1/student-self-register → 404
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 404,
  "browser": "Chrome",
  "endpoint": "/functions/v1/student-self-register",
  "request_id": "r_mt17e3fx_8102bcd11ff8",
  "device_type": "desktop",
  "response_body": "{\"error\":\"رقم الهوية غير مسجّل في المدرسة — تأكد أن الإدارة رفعت بياناتك أولاً\"}",
  "correlation_id": "c_mt17dz3s_zwm90ava",
  "possible_cause": "المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations."
}

---

## 209) [متوسط (Medium)] Edge — جديد
id: 5ec8fb82-490d-4105-ba49-8671253c12ae
الرسالة: HTTP 409 POST /functions/v1/student-self-register
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register
URL: https://northelite.tech/register
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T07:32:53.390584+00:00
أول تسجيل: 2026-08-20T07:32:53.390584+00:00
Correlation: c_mt17dz3s_zwm90ava
Request ID: r_mt17dz3t_be6a483f8314
Possible Cause: تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.
HTTP: POST /functions/v1/student-self-register → 409
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 409,
  "browser": "Chrome",
  "endpoint": "/functions/v1/student-self-register",
  "request_id": "r_mt17dz3t_be6a483f8314",
  "device_type": "desktop",
  "response_body": "{\"error\":\"هذا الطالب مرتبط بحساب آخر مسبقاً — انتقل إلى تسجيل الدخول\"}",
  "correlation_id": "c_mt17dz3s_zwm90ava",
  "possible_cause": "تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة."
}

---

## 210) [متوسط (Medium)] API — جديد — ×5
id: 3afb6950-c5c2-44fc-9ed0-6fc860baf819
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: 0543641209
المسار: /register/teacher
URL: https://northelite.tech/register/teacher
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T07:13:52.349132+00:00
أول تسجيل: 2026-08-20T06:06:19.824098+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt16picw_6ac1a434b835
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Windows",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Edge",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt16picw_6ac1a434b835",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt16picw_hvpwhlgk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 211) [عالٍ (High)] API — جديد — ×2
id: 1ccfe0a0-6725-4e8d-bff5-2d9499c75598
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.483404+00:00
أول تسجيل: 2026-08-20T06:54:25.285394+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160ex5_129d272a0785
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&user_id=eq.f6f57fb9-8f32-485b-8843-38abe2bbeb02",
  "method": "GET",
  "params": {
    "select": "*",
    "user_id": "eq.f6f57fb9-8f32-485b-8843-38abe2bbeb02"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt160ex5_129d272a0785",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 212) [عالٍ (High)] API — جديد — ×3
id: 2ebf4442-fe2e-418d-8298-ad7813cb8a64
الرسالة: Failed to fetch — GET /rest/v1/points_ledger
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.468118+00:00
أول تسجيل: 2026-08-20T06:54:25.284732+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160ewg_89d3efbc0691
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/points_ledger
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=student_id,created_at&granted_by=eq.f6f57fb9-8f32-485b-8843-38abe2bbeb02&created_at=gte.2026-08-16T21:00:00.000Z&status=in.(pending,approved)",
  "method": "GET",
  "params": {
    "select": "student_id,created_at",
    "status": "in.(pending,approved)",
    "created_at": "gte.2026-08-16T21:00:00.000Z",
    "granted_by": "eq.f6f57fb9-8f32-485b-8843-38abe2bbeb02"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/points_ledger",
  "error_name": "TypeError",
  "request_id": "r_mt160ewg_89d3efbc0691",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 213) [عالٍ (High)] API — جديد
id: 5e8df765-997e-43d0-98c1-342439a631ee
الرسالة: Failed to fetch — GET /rest/v1/school_settings
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.459086+00:00
أول تسجيل: 2026-08-20T06:54:25.459086+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160eaq_475aa720f8c2
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/school_settings
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=value&key=eq.activity_week",
  "method": "GET",
  "params": {
    "key": "eq.activity_week",
    "select": "value"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/school_settings",
  "error_name": "TypeError",
  "request_id": "r_mt160eaq_475aa720f8c2",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 214) [عالٍ (High)] API — جديد
id: 0ff4aa35-3a4f-49e1-97ce-07ec4f7184be
الرسالة: Failed to fetch — GET /rest/v1/attendance
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.285641+00:00
أول تسجيل: 2026-08-20T06:54:25.285641+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160eat_d2548068f9ea
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/attendance
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=status",
  "method": "GET",
  "params": {
    "select": "status"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/attendance",
  "error_name": "TypeError",
  "request_id": "r_mt160eat_d2548068f9ea",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 215) [عالٍ (High)] API — جديد
id: 52de66ad-224a-4c4b-b8c0-b9865cc15087
الرسالة: Failed to fetch — HEAD /rest/v1/notifications
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.276624+00:00
أول تسجيل: 2026-08-20T06:54:25.276624+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160eap_e960d16c96ec
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: HEAD /rest/v1/notifications
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&is_read=eq.false",
  "method": "HEAD",
  "params": {
    "select": "*",
    "is_read": "eq.false"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/notifications",
  "error_name": "TypeError",
  "request_id": "r_mt160eap_e960d16c96ec",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 216) [عالٍ (High)] API — جديد
id: 8330f39b-5c0f-42ef-b487-0f71bf78ac62
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.276501+00:00
أول تسجيل: 2026-08-20T06:54:25.276501+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160ew3_68a06aecdc0e
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&user_id=eq.f6f57fb9-8f32-485b-8843-38abe2bbeb02",
  "method": "GET",
  "params": {
    "select": "*",
    "user_id": "eq.f6f57fb9-8f32-485b-8843-38abe2bbeb02"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt160ew3_68a06aecdc0e",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 217) [عالٍ (High)] API — جديد
id: a90acbd4-78c9-4a9f-b37a-652814eed9ef
الرسالة: Failed to fetch — GET /rest/v1/students
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.276448+00:00
أول تسجيل: 2026-08-20T06:54:25.276448+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160evx_1a8c163ccd4c
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/students
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&is_active=eq.true",
  "method": "GET",
  "params": {
    "select": "*",
    "is_active": "eq.true"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/students",
  "error_name": "TypeError",
  "request_id": "r_mt160evx_1a8c163ccd4c",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 218) [عالٍ (High)] API — جديد
id: 7783e341-61e7-40bd-8fb2-788fd87ba0af
الرسالة: Failed to fetch — POST /rest/v1/rpc/get_feature_visibility
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.276337+00:00
أول تسجيل: 2026-08-20T06:54:25.276337+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160eal_0df01782b5b5
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /rest/v1/rpc/get_feature_visibility
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/get_feature_visibility",
  "error_name": "TypeError",
  "request_id": "r_mt160eal_0df01782b5b5",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 219) [عالٍ (High)] API — جديد
id: 6cb4a197-3555-4a76-bba2-0e743c1761f2
الرسالة: Failed to fetch — HEAD /rest/v1/exams
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.2754+00:00
أول تسجيل: 2026-08-20T06:54:25.2754+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160eat_da9bf88c0816
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: HEAD /rest/v1/exams
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*&is_active=eq.true",
  "method": "HEAD",
  "params": {
    "select": "*",
    "is_active": "eq.true"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "error_name": "TypeError",
  "request_id": "r_mt160eat_da9bf88c0816",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 220) [عالٍ (High)] API — جديد
id: ae51679f-6c59-48fa-9456-a8c4e42d71cd
الرسالة: Failed to fetch — HEAD /rest/v1/students
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:54:25.275234+00:00
أول تسجيل: 2026-08-20T06:54:25.275234+00:00
Correlation: c_mt160cjo_yamzclbg
Request ID: r_mt160ear_3441b46c29bb
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: HEAD /rest/v1/students
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "?select=*",
  "method": "HEAD",
  "params": {
    "select": "*"
  },
  "browser": "Chrome",
  "endpoint": "/rest/v1/students",
  "error_name": "TypeError",
  "request_id": "r_mt160ear_3441b46c29bb",
  "user_phone": "557358067",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt160cjo_yamzclbg",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 221) [متوسط (Medium)] API — جديد — ×3
id: 700b3c59-d086-4e5d-a5c7-f36323194408
الرسالة: HTTP 400 POST /rest/v1/points_ledger
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T06:38:10.20969+00:00
أول تسجيل: 2026-08-20T06:36:15.644668+00:00
Correlation: c_mt157lsm_m05ksoc6
Request ID: r_mt15flok_bb685dad2ba6
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/points_ledger → 400
Context:
{
  "os": "Windows",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?columns=\"student_id\",\"granted_by\",\"activity_id\",\"manual_activity_name\",\"points\",\"note\",\"status\",\"approved_by\",\"approved_at\",\"first_approved_by\",\"first_approved_at\",\"rejection_reason\",\"academic_year\",\"source\",\"evidence_attachments\"",
  "method": "POST",
  "params": {
    "columns": "\"student_id\",\"granted_by\",\"activity_id\",\"manual_activity_name\",\"points\",\"note\",\"status\",\"approved_by\",\"approved_at\",\"first_approved_by\",\"first_approved_at\",\"rejection_reason\",\"academic_year\",\"source\",\"evidence_attachments\""
  },
  "status": 400,
  "browser": "Edge",
  "endpoint": "/rest/v1/points_ledger",
  "request_id": "r_mt15flok_bb685dad2ba6",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"code\":\"P0001\",\"details\":null,\"hint\":null,\"message\":\"WEEKLY_LIMIT_EXCEEDED: تجاوزت الحد الأسبوعي. المتبقي: 10 نقطة\"}",
  "correlation_id": "c_mt157lsm_m05ksoc6",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 222) [متوسط (Medium)] واجهة — جديد
id: 88a93527-f8d0-49fc-ac36-9a119a14517a
الرسالة: تجاوزت الحد الأسبوعي للمنح. المتبقي: 10 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T06:38:10.206974+00:00
أول تسجيل: 2026-08-20T06:38:10.206974+00:00
Correlation: c_mt157lsm_m05ksoc6
Request ID: r_mt15flok_c658227bd020
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 10 نقطة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)
Context:
{
  "os": "Windows",
  "type": "toast_error",
  "browser": "Edge",
  "error_name": "Error",
  "request_id": "r_mt15flok_c658227bd020",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 10 نقطة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)",
  "correlation_id": "c_mt157lsm_m05ksoc6",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 223) [متوسط (Medium)] واجهة — جديد
id: 75720fa4-e2d8-482a-a0b8-196ac9ff5cf0
الرسالة: تجاوزت الحد الأسبوعي للمنح. المتبقي: 10 نقطة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T06:38:10.189582+00:00
أول تسجيل: 2026-08-20T06:38:10.189582+00:00
Correlation: c_mt157lsm_m05ksoc6
Request ID: r_mt15flok_275d692ee44d
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 10 نقطة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)
Context:
{
  "os": "Windows",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Edge",
  "error_name": "Error",
  "request_id": "r_mt15flok_275d692ee44d",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: تجاوزت الحد الأسبوعي للمنح. المتبقي: 10 نقطة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)",
  "correlation_id": "c_mt157lsm_m05ksoc6",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 224) [متوسط (Medium)] واجهة — جديد — ×2
id: 7afff45a-5cf0-47e5-84c6-dd3eea716a53
الرسالة: لا يمكن منح نقاط لطالب خارج فصولك المسندة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T06:36:47.482233+00:00
أول تسجيل: 2026-08-20T06:36:15.669241+00:00
Correlation: c_mt157lsm_m05ksoc6
Request ID: r_mt15dtv4_f7d500dcce75
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
Error: لا يمكن منح نقاط لطالب خارج فصولك المسندة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)
Context:
{
  "os": "Windows",
  "type": "toast_error",
  "browser": "Edge",
  "error_name": "Error",
  "request_id": "r_mt15dtv4_f7d500dcce75",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: لا يمكن منح نقاط لطالب خارج فصولك المسندة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)",
  "correlation_id": "c_mt157lsm_m05ksoc6",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 225) [متوسط (Medium)] واجهة — جديد — ×2
id: 9f16bac4-ffd6-4af8-95d4-0c6cdcf0719a
الرسالة: لا يمكن منح نقاط لطالب خارج فصولك المسندة
المستخدم: moahmed | الدور: teacher | الجوال: 054364099
المسار: /points/grant
URL: http://localhost:5173/points/grant
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T06:36:47.481107+00:00
أول تسجيل: 2026-08-20T06:36:15.647712+00:00
Correlation: c_mt157lsm_m05ksoc6
Request ID: r_mt15dtv3_6f044ea596d5
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: لا يمكن منح نقاط لطالب خارج فصولك المسندة
    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)
Context:
{
  "os": "Windows",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Edge",
  "error_name": "Error",
  "request_id": "r_mt15dtv3_6f044ea596d5",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: لا يمكن منح نقاط لطالب خارج فصولك المسندة\n    at Object.mutationFn (http://localhost:5173/src/pages/points/GrantPointsPage.tsx?t=1787207781904:215:21)",
  "correlation_id": "c_mt157lsm_m05ksoc6",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 226) [عالٍ (High)] API — جديد
id: 695bfd90-3032-402f-a6b0-c430e1d7996e
الرسالة: Failed to fetch — POST /functions/v1/student-self-register
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /register
URL: http://localhost:5173/register
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T06:32:29.447548+00:00
أول تسجيل: 2026-08-20T06:32:29.447548+00:00
Correlation: c_mt157lsm_m05ksoc6
Request ID: r_mt158ahp_78ac0f48e596
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/student-self-register
Stack:
TypeError: Failed to fetch
    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts?t=1787207533173:417:22)
    at invokePublicFunction (http://localhost:5173/src/lib/auth.ts?t=1787207533173:110:20)
    at registerStudentByNationalId (http://localhost:5173/src/lib/auth.ts?t=1787207533173:165:9)
    at handleSubmit (http://localhost:5173/src/pages/RegisterPage.tsx?t=1787207533173:53:26)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=239cca6c:9141:5)
Context:
{
  "os": "Windows",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Edge",
  "endpoint": "/functions/v1/student-self-register",
  "error_name": "TypeError",
  "request_id": "r_mt158ahp_78ac0f48e596",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts?t=1787207533173:417:22)\n    at invokePublicFunction (http://localhost:5173/src/lib/auth.ts?t=1787207533173:110:20)\n    at registerStudentByNationalId (http://localhost:5173/src/lib/auth.ts?t=1787207533173:165:9)\n    at handleSubmit (http://localhost:5173/src/pages/RegisterPage.tsx?t=1787207533173:53:26)\n    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=239cca6c:9141:5)",
  "correlation_id": "c_mt157lsm_m05ksoc6",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 227) [عالٍ (High)] API — جديد — ×4
id: 02966793-f2db-43a1-857e-20f1cdf829b2
الرسالة: Failed to fetch — POST /functions/v1/student-login-email
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: http://localhost:5173/login
الجهاز: Chrome · Windows · desktop
آخر ظهور: 2026-08-20T06:29:27.795695+00:00
أول تسجيل: 2026-08-20T06:29:10.05894+00:00
Correlation: c_mt14xdpd_o1n6a1it
Request ID: r_mt154egt_a87346cdc15d
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/student-login-email
Stack:
TypeError: Failed to fetch
    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts?t=1787207125775:417:22)
    at invokePublicFunction (http://localhost:5173/src/lib/auth.ts?t=1787207125775:110:20)
    at resolveStudentLoginEmail (http://localhost:5173/src/lib/auth.ts?t=1787207125775:172:23)
    at signIn (http://localhost:5173/src/lib/auth.ts?t=1787207125775:276:47)
    at handleSubmit (http://localhost:5173/src/pages/LoginPage.tsx?t=1787207125775:59:42)
Context:
{
  "os": "Windows",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/functions/v1/student-login-email",
  "error_name": "TypeError",
  "request_id": "r_mt154egt_a87346cdc15d",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at window.fetch (http://localhost:5173/src/lib/platformErrors.ts?t=1787207125775:417:22)\n    at invokePublicFunction (http://localhost:5173/src/lib/auth.ts?t=1787207125775:110:20)\n    at resolveStudentLoginEmail (http://localhost:5173/src/lib/auth.ts?t=1787207125775:172:23)\n    at signIn (http://localhost:5173/src/lib/auth.ts?t=1787207125775:276:47)\n    at handleSubmit (http://localhost:5173/src/pages/LoginPage.tsx?t=1787207125775:59:42)",
  "correlation_id": "c_mt14xdpd_o1n6a1it",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 228) [حرج (Critical)] Edge — جديد — ×4
id: f27986bc-f3db-45c5-b625-7a59835fb21f
الرسالة: HTTP 502 POST /functions/v1/ai-generate
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:24:54.594093+00:00
أول تسجيل: 2026-08-20T06:15:04.376183+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt14yigm_fd849f6df523
Possible Cause: بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة.
HTTP: POST /functions/v1/ai-generate → 502
Context:
{
  "os": "Windows",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 502,
  "browser": "Chrome",
  "endpoint": "/functions/v1/ai-generate",
  "request_id": "r_mt14yigm_fd849f6df523",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"error\":\"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 is not a valid model ID\"}",
  "correlation_id": "c_mt14xdpd_o1n6a1it",
  "possible_cause": "بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة."
}

---

## 229) [متوسط (Medium)] واجهة — جديد — ×3
id: 8b41055a-d383-4ac0-9962-ee8b660a500f
الرسالة: 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 is not a valid model ID
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:24:54.581464+00:00
أول تسجيل: 2026-08-20T06:15:04.409322+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt14yjsg_11878b5a1223
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: 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 is not a valid model ID
    at Object.generate (http://localhost:5173/src/lib/ai/aiAssistantService.ts?t=1787207029256:77:10)
Context:
{
  "os": "Windows",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt14yjsg_11878b5a1223",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: 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 is not a valid model ID\n    at Object.generate (http://localhost:5173/src/lib/ai/aiAssistantService.ts?t=1787207029256:77:10)",
  "correlation_id": "c_mt14xdpd_o1n6a1it",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 230) [عالٍ (High)] Edge — جديد — ×4
id: 1c6f3004-5fa3-4e86-99ac-05108e2a0c35
الرسالة: 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 is not a valid model ID
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:24:54.577203+00:00
أول تسجيل: 2026-08-20T06:15:04.387085+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt14yjsg_111c5c92df96
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "fn": "ai-generate",
  "os": "Windows",
  "browser": "Chrome",
  "task_code": "individual_activity",
  "error_name": "Error",
  "request_id": "r_mt14yjsg_111c5c92df96",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt14xdpd_o1n6a1it",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 231) [حرج (Critical)] Edge — جديد — ×4
id: ff3b5e42-552a-4783-ba06-ea309122909f
الرسالة: HTTP 503 POST /functions/v1/ai-generate
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:17:37.699031+00:00
أول تسجيل: 2026-08-20T06:16:29.93898+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt14p603_72514346a6fa
Possible Cause: بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة.
HTTP: POST /functions/v1/ai-generate → 503
Context:
{
  "os": "Windows",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "fetch_status",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 503,
  "browser": "Edge",
  "endpoint": "/functions/v1/ai-generate",
  "request_id": "r_mt14p603_72514346a6fa",
  "user_phone": "054364099",
  "device_type": "desktop",
  "response_body": "{\"error\":\"OPENROUTER_API_KEY غير مضبوط في Secrets\"}",
  "correlation_id": "c_mt14p6no_jp1cml6c",
  "possible_cause": "بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة."
}

---

## 232) [متوسط (Medium)] واجهة — جديد — ×3
id: b899ebf4-46dd-4926-a1ea-31c613305ad4
الرسالة: OPENROUTER_API_KEY غير مضبوط في Secrets
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:17:37.698125+00:00
أول تسجيل: 2026-08-20T06:16:29.949839+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt14p6ns_a23764fe730f
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: OPENROUTER_API_KEY غير مضبوط في Secrets
    at Object.generate (https://northelite.tech/assets/index-DjiXnBVY.js:576:9894)
Context:
{
  "os": "Windows",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Edge",
  "error_name": "Error",
  "request_id": "r_mt14p6ns_a23764fe730f",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": "Error: OPENROUTER_API_KEY غير مضبوط في Secrets\n    at Object.generate (https://northelite.tech/assets/index-DjiXnBVY.js:576:9894)",
  "correlation_id": "c_mt14p6no_jp1cml6c",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 233) [عالٍ (High)] Edge — جديد — ×4
id: 2dd173f9-ccc3-4904-9d80-40be951b33e7
الرسالة: OPENROUTER_API_KEY غير مضبوط في Secrets
المستخدم: Ahmed Medhat | الدور: teacher | الجوال: 557358067
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T06:17:37.695095+00:00
أول تسجيل: 2026-08-20T06:16:29.940724+00:00
Correlation: c_mt14ancv_v7k3m7e2
Request ID: r_mt14p6nr_8d03c68edcfa
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Context:
{
  "fn": "ai-generate",
  "os": "Windows",
  "browser": "Edge",
  "task_code": "edu_game",
  "error_name": "Error",
  "request_id": "r_mt14p6nr_8d03c68edcfa",
  "user_phone": "054364099",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt14p6no_jp1cml6c",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 234) [متوسط (Medium)] API — جديد — ×4
id: 26f1509f-707b-4864-b5c2-0d2f3e222f7a
الرسالة: HTTP 400 POST /rest/v1/rpc/lookup_student_by_national_id
المستخدم: moahmed | الدور: student | الجوال: غير مسجّل
المسار: /onboarding
URL: https://northelite.tech/onboarding
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T05:50:38.609399+00:00
أول تسجيل: 2026-08-20T05:36:08.522275+00:00
Correlation: c_mt137tc7_20zhjjgd
Request ID: r_mt13qgou_bb2fe06f95c4
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/rpc/lookup_student_by_national_id → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/lookup_student_by_national_id",
  "request_id": "r_mt13qgou_bb2fe06f95c4",
  "device_type": "mobile",
  "response_body": "{\"code\":\"P0001\",\"details\":null,\"hint\":null,\"message\":\"هذا الطالب مرتبط بحساب آخر مسبقاً\"}",
  "correlation_id": "c_mt13kjof_ob11jo60",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 235) [متوسط (Medium)] واجهة — جديد — ×5
id: 7abfc4e9-e20f-43fa-b295-c770d5f54ee6
الرسالة: column exams.starts_at does not exist
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T05:43:24.088869+00:00
أول تسجيل: 2026-08-20T05:37:52.374093+00:00
Correlation: c_mt137tc7_20zhjjgd
Request ID: r_mt13h65a_3af9eb8c410e
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Windows",
  "kind": "query",
  "type": "react_query",
  "browser": "Edge",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_mt13h65a_3af9eb8c410e",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": null,
  "correlation_id": "c_mt12hpe1_spjc7ew6",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 236) [متوسط (Medium)] API — جديد — ×5
id: 9a60d6b0-0803-4526-bd78-68162ef86f0a
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-20T05:43:22.918312+00:00
أول تسجيل: 2026-08-20T05:37:50.983445+00:00
Correlation: c_mt137tc7_20zhjjgd
Request ID: r_mt13h57m_d132013e92d2
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Windows",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Edge",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_mt13h57m_d132013e92d2",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_mt12hpe1_spjc7ew6",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 237) [عالٍ (High)] API — جديد
id: d479c3bd-9386-4586-ab79-63e0fa501fbd
الرسالة: Failed to fetch — GET /rest/v1/points_ledger
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T05:30:40.358799+00:00
أول تسجيل: 2026-08-20T05:30:40.358799+00:00
Correlation: c_mt12hpe1_spjc7ew6
Request ID: r_mt130sse_9ac1afc8ff3d
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/points_ledger
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Windows",
  "type": "fetch_network",
  "query": "?select=student_id,created_at&granted_by=eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787&created_at=gte.2026-08-16T21:00:00.000Z&status=in.(pending,approved)",
  "method": "GET",
  "params": {
    "select": "student_id,created_at",
    "status": "in.(pending,approved)",
    "created_at": "gte.2026-08-16T21:00:00.000Z",
    "granted_by": "eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787"
  },
  "browser": "Edge",
  "endpoint": "/rest/v1/points_ledger",
  "error_name": "TypeError",
  "request_id": "r_mt130sse_9ac1afc8ff3d",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt12hpe1_spjc7ew6",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 238) [عالٍ (High)] API — جديد
id: 48491d1f-8771-4ca3-97e3-97264fbcbab3
الرسالة: Failed to fetch — GET /rest/v1/students
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T05:30:40.35808+00:00
أول تسجيل: 2026-08-20T05:30:40.35808+00:00
Correlation: c_mt12hpe1_spjc7ew6
Request ID: r_mt130ssd_bda5a6967d6d
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/students
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Windows",
  "type": "fetch_network",
  "query": "?select=*&is_active=eq.true",
  "method": "GET",
  "params": {
    "select": "*",
    "is_active": "eq.true"
  },
  "browser": "Edge",
  "endpoint": "/rest/v1/students",
  "error_name": "TypeError",
  "request_id": "r_mt130ssd_bda5a6967d6d",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt12hpe1_spjc7ew6",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 239) [عالٍ (High)] API — جديد
id: df2b9915-9966-4109-87c7-c243eae5f7c7
الرسالة: Failed to fetch — GET /rest/v1/points_ledger
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T05:30:40.357317+00:00
أول تسجيل: 2026-08-20T05:30:40.357317+00:00
Correlation: c_mt12hpe1_spjc7ew6
Request ID: r_mt130ssf_1411d7d58763
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/points_ledger
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Windows",
  "type": "fetch_network",
  "query": "?select=created_at&granted_by=eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787&order=created_at.desc&limit=1",
  "method": "GET",
  "params": {
    "limit": "1",
    "order": "created_at.desc",
    "select": "created_at",
    "granted_by": "eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787"
  },
  "browser": "Edge",
  "endpoint": "/rest/v1/points_ledger",
  "error_name": "TypeError",
  "request_id": "r_mt130ssf_1411d7d58763",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt12hpe1_spjc7ew6",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 240) [عالٍ (High)] API — جديد
id: aa519f12-3c90-4545-82d2-6f9c8cbc2ae8
الرسالة: Failed to fetch — GET /rest/v1/teachers
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /dashboard
URL: https://northelite.tech/dashboard
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T05:30:40.356703+00:00
أول تسجيل: 2026-08-20T05:30:40.356703+00:00
Correlation: c_mt12hpe1_spjc7ew6
Request ID: r_mt130ssd_5d0adc34d008
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: GET /rest/v1/teachers
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227
Context:
{
  "os": "Windows",
  "type": "fetch_network",
  "query": "?select=*&user_id=eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787",
  "method": "GET",
  "params": {
    "select": "*",
    "user_id": "eq.60d8e6ee-2c68-4063-94fd-1ff1d0a5e787"
  },
  "browser": "Edge",
  "endpoint": "/rest/v1/teachers",
  "error_name": "TypeError",
  "request_id": "r_mt130ssd_5d0adc34d008",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847\n    at async https://northelite.tech/assets/index-DjiXnBVY.js:9:42227",
  "correlation_id": "c_mt12hpe1_spjc7ew6",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 241) [متوسط (Medium)] API — جديد — ×3
id: 96eedd34-d67d-41a3-962a-25eb98f95a4d
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Edge · Windows · desktop
آخر ظهور: 2026-08-20T05:24:23.175157+00:00
أول تسجيل: 2026-08-20T05:15:49.738049+00:00
Correlation: c_mt12hpe1_spjc7ew6
Request ID: r_mt12soyr_5b32bdf92a80
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Edge",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mt12soyr_5b32bdf92a80",
  "device_type": "desktop",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mt12soyr_e2bvofz6",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 242) [عالٍ (High)] AI — جديد
id: 5ee7bef4-25fd-4922-b444-f356a5d10ade
الرسالة: انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T04:15:12.62009+00:00
أول تسجيل: 2026-08-20T04:15:12.62009+00:00
Correlation: c_mt10br64_ub12n1my
Request ID: r_mt10br64_aed62f04dbd0
Possible Cause: مشكلة مزوّد AI أو رصيد/مفتاح API — راجع إعدادات AI والاستخدام.
Stack:
Error: انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.
    at https://northelite.tech/assets/index-DjiXnBVY.js:576:9318
Context:
{
  "os": "Linux",
  "browser": "Chrome",
  "task_code": "curriculum_map",
  "error_name": "Error",
  "request_id": "r_mt10br64_aed62f04dbd0",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "Error: انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.\n    at https://northelite.tech/assets/index-DjiXnBVY.js:576:9318",
  "correlation_id": "c_mt10br64_ub12n1my",
  "possible_cause": "مشكلة مزوّد AI أو رصيد/مفتاح API — راجع إعدادات AI والاستخدام."
}

---

## 243) [متوسط (Medium)] واجهة — جديد
id: a8bf57c2-12f9-463e-86aa-74ff4dbd6f08
الرسالة: انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.
المستخدم: مصطفي احمد اسماعيل مصطفي | الدور: teacher | الجوال: 0543641209
المسار: /teacher/ai-assistant
URL: https://northelite.tech/teacher/ai-assistant
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-20T04:15:12.62007+00:00
أول تسجيل: 2026-08-20T04:15:12.62007+00:00
Correlation: c_mt10br64_ub12n1my
Request ID: r_mt10br69_2e3d0f250789
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Stack:
Error: انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.
    at https://northelite.tech/assets/index-DjiXnBVY.js:576:9318
Context:
{
  "os": "Linux",
  "kind": "mutation",
  "type": "react_query",
  "browser": "Chrome",
  "error_name": "Error",
  "request_id": "r_mt10br69_2e3d0f250789",
  "user_phone": "0543641209",
  "device_type": "desktop",
  "stack_short": "Error: انتهت مهلة الانتظار (60 ثانية). غالباً مفتاح OpenRouter غير مضبوط في Secrets أو الدالة القديمة لم تُحدَّث.\n    at https://northelite.tech/assets/index-DjiXnBVY.js:576:9318",
  "correlation_id": "c_mt10br64_ub12n1my",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 244) [عالٍ (High)] API — جديد
id: 3b4ab1b5-1a19-49ac-9b4a-6b0096725a30
الرسالة: Failed to fetch — POST /functions/v1/accept-staff-invite
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /competition/admin
URL: https://northelite.tech/competition/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:36.078982+00:00
أول تسجيل: 2026-08-17T08:54:36.078982+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzzhtt_1ec679ae3739
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/accept-staff-invite
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/functions/v1/accept-staff-invite",
  "error_name": "TypeError",
  "request_id": "r_mswzzhtt_1ec679ae3739",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 245) [عالٍ (High)] API — جديد
id: f84d51f4-b8eb-41d7-bfa9-57b776f54c4c
الرسالة: Failed to fetch — POST /functions/v1/create-staff-invite
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /competition/admin
URL: https://northelite.tech/competition/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:35.869104+00:00
أول تسجيل: 2026-08-17T08:54:35.869104+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzzhmu_89f8067f0fe5
Possible Cause: فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.
HTTP: POST /functions/v1/create-staff-invite
Stack:
TypeError: Failed to fetch
    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)
    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323
    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847
Context:
{
  "os": "Android",
  "type": "fetch_network",
  "query": "",
  "method": "POST",
  "params": {},
  "browser": "Chrome",
  "endpoint": "/functions/v1/create-staff-invite",
  "error_name": "TypeError",
  "request_id": "r_mswzzhmu_89f8067f0fe5",
  "device_type": "mobile",
  "stack_short": "TypeError: Failed to fetch\n    at Ka.window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:34:13367)\n    at window.fetch (https://northelite.tech/assets/index-DjiXnBVY.js:282:75947)\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48323\n    at https://northelite.tech/assets/index-DjiXnBVY.js:32:48847",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS."
}

---

## 246) [متوسط (Medium)] Edge — جديد
id: d9739936-dbdd-48b8-8917-fa8e5960ce7b
الرسالة: HTTP 400 POST /functions/v1/bulk-create-class-accounts
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /competition/admin
URL: https://northelite.tech/competition/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:35.622943+00:00
أول تسجيل: 2026-08-17T08:54:35.622943+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzzhmr_b15347320b7e
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/bulk-create-class-accounts → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/bulk-create-class-accounts",
  "request_id": "r_mswzzhmr_b15347320b7e",
  "device_type": "mobile",
  "response_body": "{\"error\":\"الحقول المطلوبة: grade, class_name, students[]\"}",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 247) [متوسط (Medium)] Edge — جديد
id: 01f149ad-9298-423d-82b2-443702ff98a8
الرسالة: HTTP 400 POST /functions/v1/delete-user
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /competition/admin
URL: https://northelite.tech/competition/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:32.955722+00:00
أول تسجيل: 2026-08-17T08:54:32.955722+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzzfks_c593c9aa8039
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/delete-user → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/delete-user",
  "request_id": "r_mswzzfks_c593c9aa8039",
  "device_type": "mobile",
  "response_body": "{\"error\":\"معرّف المستخدم مطلوب\"}",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 248) [متوسط (Medium)] Edge — جديد
id: 602e0f7b-637e-4f4c-ae29-d54e7208bcbb
الرسالة: HTTP 400 POST /functions/v1/admin-update-user
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /competition/admin
URL: https://northelite.tech/competition/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:30.380319+00:00
أول تسجيل: 2026-08-17T08:54:30.380319+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzzdl2_664f831e4948
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/admin-update-user → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/admin-update-user",
  "request_id": "r_mswzzdl2_664f831e4948",
  "device_type": "mobile",
  "response_body": "{\"error\":\"معرّف المستخدم مطلوب\"}",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 249) [متوسط (Medium)] Edge — جديد
id: 0942fd2e-07e8-467e-bae6-e1552e2b09bf
الرسالة: HTTP 400 POST /functions/v1/register-user
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /competition/admin
URL: https://northelite.tech/competition/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:27.345494+00:00
أول تسجيل: 2026-08-17T08:54:27.345494+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzzb8h_b2a6fc4f33e6
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/register-user → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/register-user",
  "request_id": "r_mswzzb8h_b2a6fc4f33e6",
  "device_type": "mobile",
  "response_body": "{\"error\":\"الحقول المطلوبة: البريد، كلمة المرور، الاسم، الدور\"}",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 250) [متوسط (Medium)] Edge — جديد
id: 3ba0caf3-7e5c-4447-a66c-64f9f7434cb2
الرسالة: HTTP 400 POST /functions/v1/create-user
المستخدم: احمد مدحت اﻻمين | الدور: admin | الجوال: غير مسجّل
المسار: /qa/simulator
URL: https://northelite.tech/qa/simulator
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:54:24.796234+00:00
أول تسجيل: 2026-08-17T08:54:24.796234+00:00
Correlation: c_mswzz988_wjdt5kkk
Request ID: r_mswzz988_1cbe1a970415
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /functions/v1/create-user → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/functions/v1/create-user",
  "request_id": "r_mswzz988_1cbe1a970415",
  "device_type": "mobile",
  "response_body": "{\"error\":\"Missing required fields: email, password, full_name, role\"}",
  "correlation_id": "c_mswzz988_wjdt5kkk",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 251) [متوسط (Medium)] API — جديد
id: 941c9872-ed56-41af-b7fb-8b87c908309b
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /admin
URL: https://northelite.tech/admin
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-17T08:29:45.669573+00:00
أول تسجيل: 2026-08-17T08:29:45.669573+00:00
Correlation: c_mswz3jhd_cbd4eeu2
Request ID: r_mswz3jhd_115e42966ac1
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_mswz3jhd_115e42966ac1",
  "device_type": "mobile",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_mswz3jhd_cbd4eeu2",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 252) [متوسط (Medium)] API — جديد
id: 9bd13771-bd31-4566-8410-96015d329f00
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /
URL: http://localhost:5173/login
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-05T19:55:18.541866+00:00
أول تسجيل: 2026-08-05T19:55:18.541866+00:00
Correlation: c_msgiaxst_o7j1yhk4
Request ID: r_msgiaxsu_24ac828e9276
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Linux",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=refresh_token",
  "method": "POST",
  "params": {
    "grant_type": "refresh_token"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_msgiaxsu_24ac828e9276",
  "device_type": "desktop",
  "response_body": "{\"code\":\"refresh_token_not_found\",\"message\":\"Invalid Refresh Token: Refresh Token Not Found\"}",
  "correlation_id": "c_msgiaxst_o7j1yhk4",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 253) [متوسط (Medium)] API — جديد
id: a1fc4de4-4171-4bc9-8719-9a39055b2e75
الرسالة: HTTP 400 POST /auth/v1/token
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T17:13:07.558939+00:00
أول تسجيل: 2026-08-02T17:13:07.558939+00:00
Correlation: c_msc261c7_3i5nz9n6
Request ID: r_msc26t35_edcb7443dc4a
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /auth/v1/token → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?grant_type=password",
  "method": "POST",
  "params": {
    "grant_type": "password"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/auth/v1/token",
  "request_id": "r_msc26t35_edcb7443dc4a",
  "device_type": "mobile",
  "response_body": "{\"code\":\"invalid_credentials\",\"message\":\"Invalid login credentials\"}",
  "correlation_id": "c_msc261c7_3i5nz9n6",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 254) [متوسط (Medium)] واجهة — جديد — ×2
id: 65d73c94-6881-4a57-9980-2f71e259cc77
الرسالة: column exams.starts_at does not exist
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 01061308299
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T15:53:09.568106+00:00
أول تسجيل: 2026-08-02T15:51:11.516364+00:00
Correlation: c_msbz8m21_lrdeo151
Request ID: r_msbzbypo_72d3c14d5741
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_msbzbypo_72d3c14d5741",
  "user_phone": "01061308299",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_msbz8m21_lrdeo151",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 255) [متوسط (Medium)] API — جديد — ×2
id: 69b8f641-4cb2-44d4-9faf-06cdbf14c750
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: حسن أحمد إسماعيل | الدور: student | الجوال: 01061308299
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T15:53:09.550313+00:00
أول تسجيل: 2026-08-02T15:51:10.218937+00:00
Correlation: c_msbz8m21_lrdeo151
Request ID: r_msbzbypm_66557ab722c7
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_msbzbypm_66557ab722c7",
  "user_phone": "01061308299",
  "device_type": "mobile",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_msbz8m21_lrdeo151",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 256) [متوسط (Medium)] API — جديد
id: 657581c1-58c8-45c7-a5cc-dfdc6d841001
الرسالة: HTTP 400 POST /rest/v1/rpc/lookup_student_by_national_id
المستخدم: Hassan Ahmed | الدور: student | الجوال: غير مسجّل
المسار: /onboarding
URL: https://northelite.tech/onboarding
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T15:50:33.342826+00:00
أول تسجيل: 2026-08-02T15:50:33.342826+00:00
Correlation: c_msbz8m21_lrdeo151
Request ID: r_msbz8m21_cce2124f130b
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/rpc/lookup_student_by_national_id → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/lookup_student_by_national_id",
  "request_id": "r_msbz8m21_cce2124f130b",
  "device_type": "mobile",
  "response_body": "{\"code\":\"P0001\",\"details\":null,\"hint\":null,\"message\":\"رقم الهوية غير مسجّل في المدرسة — تأكد من رفع بياناتك من الإدارة\"}",
  "correlation_id": "c_msbz8m21_lrdeo151",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 257) [متوسط (Medium)] واجهة — جديد — ×5
id: 21cb0b20-de99-4cf7-b0df-2390f81b0482
الرسالة: column exams.starts_at does not exist
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:59:28.905311+00:00
أول تسجيل: 2026-08-02T11:49:10.07134+00:00
Correlation: c_msbqm43e_8ycvoyps
Request ID: r_msbqzgmf_c8f229af6591
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "error_name": "42703",
  "request_id": "r_msbqzgmf_c8f229af6591",
  "user_phone": "0543641209",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_msbqm43e_8ycvoyps",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 258) [متوسط (Medium)] API — جديد — ×6
id: 822531b4-dde6-470d-84d3-c1fc90ea14b0
الرسالة: HTTP 400 GET /rest/v1/exams
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Edge · Linux · desktop
آخر ظهور: 2026-08-02T11:59:27.583482+00:00
أول تسجيل: 2026-08-02T11:49:06.23965+00:00
Correlation: c_msbqm43e_8ycvoyps
Request ID: r_msbqzflj_254473413618
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: GET /rest/v1/exams → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "?select=*&grade=eq.الأول+المتوسط&is_active=eq.true&order=starts_at.asc&limit=10",
  "method": "GET",
  "params": {
    "grade": "eq.الأول المتوسط",
    "limit": "10",
    "order": "starts_at.asc",
    "select": "*",
    "is_active": "eq.true"
  },
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/exams",
  "request_id": "r_msbqzflj_254473413618",
  "user_phone": "0543641209",
  "device_type": "mobile",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column exams.starts_at does not exist\"}",
  "correlation_id": "c_msbqm43e_8ycvoyps",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 259) [متوسط (Medium)] واجهة — جديد — ×4
id: 242eef1f-97b1-4d9c-9c18-eb69aabef11a
الرسالة: Could not embed because more than one relationship was found for 'activity_suggestions' and 'students'
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:59:19.286105+00:00
أول تسجيل: 2026-08-02T11:49:09.594617+00:00
Correlation: c_msbqm43e_8ycvoyps
Request ID: r_msbqz96g_93cedcb08301
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "activity-suggestions"
  ],
  "error_name": "PGRST201",
  "request_id": "r_msbqz96g_93cedcb08301",
  "user_phone": "0543641209",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_msbqm43e_8ycvoyps",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 260) [عالٍ (High)] واجهة — جديد
id: 163eddaa-3de3-4167-8e49-6bc421b65459
الرسالة: Cannot read properties of undefined (reading 'charAt')
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:59:19.282118+00:00
أول تسجيل: 2026-08-02T11:59:19.282118+00:00
Correlation: c_msbqm43e_8ycvoyps
Request ID: r_msbqz95j_85b4f96f6b41
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
Stack:
TypeError: Cannot read properties of undefined (reading 'charAt')
    at kEt (https://northelite.tech/assets/index-CxJpXqiR.js:1211:12280)
    at vo (https://northelite.tech/assets/index-CxJpXqiR.js:8:47571)
    at sc (https://northelite.tech/assets/index-CxJpXqiR.js:8:70181)
    at wc (https://northelite.tech/assets/index-CxJpXqiR.js:8:80463)
    at Ou (https://northelite.tech/assets/index-CxJpXqiR.js:8:116048)
Context:
{
  "os": "Android",
  "kind": "route-error",
  "type": "route-error",
  "browser": "Chrome",
  "request_id": "r_msbqz95j_85b4f96f6b41",
  "user_phone": "0543641209",
  "device_type": "mobile",
  "stack_short": "TypeError: Cannot read properties of undefined (reading 'charAt')\n    at kEt (https://northelite.tech/assets/index-CxJpXqiR.js:1211:12280)\n    at vo (https://northelite.tech/assets/index-CxJpXqiR.js:8:47571)\n    at sc (https://northelite.tech/assets/index-CxJpXqiR.js:8:70181)\n    at wc (https://northelite.tech/assets/index-CxJpXqiR.js:8:80463)\n    at Ou (https://northelite.tech/assets/index-CxJpXqiR.js:8:116048)",
  "correlation_id": "c_msbqm43e_8ycvoyps",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 261) [متوسط (Medium)] واجهة — جديد
id: 9e012f95-ac8d-4a3c-8a16-c5b3f2060760
الرسالة: column wp.subject does not exist
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student/academic
URL: https://northelite.tech/student/academic
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:49:16.075579+00:00
أول تسجيل: 2026-08-02T11:49:16.075579+00:00
Correlation: c_msbqm43e_8ycvoyps
Request ID: r_msbqmbqg_1eabe179bc5e
Possible Cause: فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "portal",
    "weekly-plans",
    "student",
    "d1e313e3-cfe5-4d3d-ac2c-6886909947d5"
  ],
  "error_name": "42703",
  "request_id": "r_msbqmbqg_1eabe179bc5e",
  "user_phone": "0543641209",
  "device_type": "mobile",
  "stack_short": null,
  "correlation_id": "c_msbqm43e_8ycvoyps",
  "possible_cause": "فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API."
}

---

## 262) [متوسط (Medium)] API — جديد
id: 9d479f1c-d4d6-4375-9e1c-807ffae29d60
الرسالة: HTTP 400 POST /rest/v1/rpc/portal_list_weekly_plans
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student/academic
URL: https://northelite.tech/student/academic
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:49:14.636025+00:00
أول تسجيل: 2026-08-02T11:49:14.636025+00:00
Correlation: c_msbqm43e_8ycvoyps
Request ID: r_msbqmanx_e07345080b0c
Possible Cause: سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.
HTTP: POST /rest/v1/rpc/portal_list_weekly_plans → 400
Context:
{
  "os": "Android",
  "host": "gjgezdbbnezsvsmygpcd.supabase.co",
  "type": "http_4xx",
  "query": "",
  "method": "POST",
  "params": {},
  "status": 400,
  "browser": "Chrome",
  "endpoint": "/rest/v1/rpc/portal_list_weekly_plans",
  "request_id": "r_msbqmanx_e07345080b0c",
  "user_phone": "0543641209",
  "device_type": "mobile",
  "response_body": "{\"code\":\"42703\",\"details\":null,\"hint\":null,\"message\":\"column wp.subject does not exist\"}",
  "correlation_id": "c_msbqm43e_8ycvoyps",
  "possible_cause": "سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID."
}

---

## 263) [متوسط (Medium)] واجهة — جديد — ×3
id: b7c6f30d-238a-49b4-80a5-64be51683241
الرسالة: [object Object]
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student/exams
URL: https://northelite.tech/student/exams
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:06:29.438447+00:00
أول تسجيل: 2026-08-02T11:03:28.39997+00:00
Correlation: s_msbowkd4_8i642oon
Request ID: —
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "portal",
    "weekly-plans",
    "student",
    "d1e313e3-cfe5-4d3d-ac2c-6886909947d5"
  ],
  "user_phone": "0543641209",
  "device_type": "mobile"
}

---

## 264) [متوسط (Medium)] API — جديد — ×3
id: 7606b0a7-a9cb-4c3f-90f8-d52f7a6bbd3a
الرسالة: HTTP 400 — https://gjgezdbbnezsvsmygpcd.supabase.co/rest/v1/rpc/portal_list_weekly_plans
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student/academic
URL: https://northelite.tech/student/academic
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-02T11:06:28.179592+00:00
أول تسجيل: 2026-08-02T11:03:27.208757+00:00
Correlation: s_msbowkd4_8i642oon
Request ID: —
HTTP: GET — → 400
Context:
{
  "os": "Android",
  "type": "http_4xx",
  "status": 400,
  "browser": "Chrome",
  "user_phone": "0543641209",
  "device_type": "mobile"
}

---

## 265) [متوسط (Medium)] واجهة — جديد — ×4
id: 77bb0e4b-ffab-4496-b24e-d6c588ee3b56
الرسالة: [object Object]
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Edge · Linux · desktop
آخر ظهور: 2026-08-02T11:06:07.201313+00:00
أول تسجيل: 2026-08-02T11:01:15.752958+00:00
Correlation: s_msbowkd4_8i642oon
Request ID: —
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "upcoming-exams",
    "الأول المتوسط"
  ],
  "user_phone": "0543641209",
  "device_type": "mobile"
}

---

## 266) [متوسط (Medium)] واجهة — جديد — ×4
id: 4778153c-3e9c-4292-8e9e-2cfd3f01227f
الرسالة: [object Object]
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Edge · Linux · desktop
آخر ظهور: 2026-08-02T11:06:06.579235+00:00
أول تسجيل: 2026-08-02T11:01:15.518715+00:00
Correlation: s_msbowkd4_8i642oon
Request ID: —
Context:
{
  "os": "Android",
  "kind": "query",
  "type": "react_query",
  "browser": "Chrome",
  "queryKey": [
    "activity-suggestions"
  ],
  "user_phone": "0543641209",
  "device_type": "mobile"
}

---

## 267) [متوسط (Medium)] API — جديد — ×4
id: 8131324d-5ec3-472e-ad78-ee991c033742
الرسالة: HTTP 400 — https://gjgezdbbnezsvsmygpcd.supabase.co/rest/v1/exams?select=*&grade=eq.%D8%A7%D9%84%D8%A3%D9%88%D9%84+%D8%A7%D9%84%D9%85%D8%AA%D9%88%D8%B3%D8%B7&is_active=eq.true&order=starts_at.asc&limit=10
المستخدم: مصطفي احمد اسماعيل | الدور: student | الجوال: 0543641209
المسار: /student
URL: https://northelite.tech/student
الجهاز: Edge · Linux · desktop
آخر ظهور: 2026-08-02T11:06:05.835689+00:00
أول تسجيل: 2026-08-02T11:01:14.63932+00:00
Correlation: s_msbowkd4_8i642oon
Request ID: —
HTTP: GET — → 400
Context:
{
  "os": "Android",
  "type": "http_4xx",
  "status": 400,
  "browser": "Chrome",
  "user_phone": "0543641209",
  "device_type": "mobile"
}

---

## 268) [متوسط (Medium)] واجهة — جديد
id: 595fe99b-06fb-43d1-b9dc-bd348c620f51
الرسالة: فشل تحميل مورد: https://northelite.tech/icon.jpeg
المستخدم: — | الدور: — | الجوال: غير مسجّل
المسار: /login
URL: https://northelite.tech/login
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-01T21:32:22.92419+00:00
أول تسجيل: 2026-08-01T21:32:22.92419+00:00
Correlation: s_msaw0bpn_zoeyt8qg
Request ID: —
Context:
{
  "os": "Android",
  "tag": "IMG",
  "type": "resource_error",
  "browser": "Chrome",
  "device_type": "mobile"
}

---

## 269) [حرج (Critical)] واجهة — جديد
id: 4caaf94e-a06d-4d62-a362-66e9dd295771
الرسالة: تعذّر حفظ الواجب المنزلي — انتهت مهلة الاتصال (محاكاة حقيقية)
المستخدم: معلم تجريبي — محمد الشمري | الدور: teacher | الجوال: 966551112233
المسار: /teacher/homework
URL: https://app.local/teacher/homework
الجهاز: Chrome · Android · mobile
آخر ظهور: 2026-08-01T20:54:13.578991+00:00
أول تسجيل: 2026-08-01T20:54:13.578991+00:00
Correlation: sim-session-ee969a4a114a
Request ID: —
Stack:
SimulatedError: at TeacherHomeworkPage.save (simulate)
Context:
{
  "from": "dev_simulate_user_error",
  "scenario": "teacher_homework",
  "simulated": true,
  "user_phone": "966551112233"
}

---

## 270) [حرج (Critical)] واجهة — جديد
id: 43bc36df-6ce2-487c-9df6-b3f630657c5a
الرسالة: اختبار Global Error Monitoring — 2026-08-01T20:51:26.717Z
المستخدم: Mostafa Ahmed | الدور: platform_developer | الجوال: غير مسجّل
المسار: /dev/errors
URL: http://localhost:5173/dev/errors
الجهاز: Chrome · Linux · desktop
آخر ظهور: 2026-08-01T20:51:26.930246+00:00
أول تسجيل: 2026-08-01T20:51:26.930246+00:00
Correlation: s_msat1vnf_oju802k9
Request ID: —
Context:
{
  "os": "Linux",
  "gem": true,
  "from": "dev-errors-ui",
  "browser": "Chrome",
  "device_type": "desktop"
}
