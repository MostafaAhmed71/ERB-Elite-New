# مسابقة النخبة — تطبيق عرض سؤال الفصل (WebView)

## البناء

يتطلب Android Studio أو JDK 17+ و Android SDK.

```powershell
cd android-apk
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```

الملف الناتج:
`android-apk/app/build/outputs/apk/debug/app-debug.apk`

## الاستخدام على الهاتف

1. ثبّت الـ APK
2. أدخل رابط الموقع المنشور أو IP جهاز التطوير (مثال: `http://192.168.1.10:5173`)
3. اختر الفصل
4. فعّل «وضع تجريبي» للاختبار فوراً بدون انتظار وقت الظهور
5. افتح شاشة السؤال

> `localhost` لا يعمل من الهاتف — استخدم IP الشبكة المحلية مع `npm run dev -- --host`.
