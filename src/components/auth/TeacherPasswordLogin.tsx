import { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { checkTeacherPassword, loginTeacherPassword, setupTeacherPassword } from '../../lib/teacherPasswordAuth';

interface Props {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onSignedIn: () => Promise<void>;
}
export function TeacherPasswordLogin({ disabled, onBusyChange, onSignedIn }: Props) {
  const [step, setStep] = useState<'phone' | 'setup' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const busy = disabled || pending;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || busy) return;
    setError(null);
    if (step === 'setup' && password !== confirmation) { setError('كلمتا المرور غير متطابقتين'); return; }
    lock.current = true;
    setPending(true);
    onBusyChange(true);
    try {
      if (step === 'phone') {
        setStep(await checkTeacherPassword(phone));
      } else {
        if (step === 'setup') {
          await setupTeacherPassword(phone, code, password);
          // Once saved, retries use password login rather than consuming the code again.
          setStep('password');
          setCode('');
          setConfirmation('');
        }
        await loginTeacherPassword(phone, password);
        await onSignedIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول؛ حاول مجدداً');
    } finally {
      lock.current = false;
      setPending(false);
      onBusyChange(false);
    }
  };
  const changePhone = () => {
    setStep('phone'); setPassword(''); setConfirmation(''); setCode(''); setError(null); setShowPassword(false);
  };
  return (
    <form onSubmit={submit}>
      <p className="login-hint">
        {step === 'phone' ? 'أدخل رقم جوالك المسجّل للمتابعة.' : step === 'setup'
          ? 'أدخل كود التفعيل الموحّد وأعدّ كلمة مرورك مرة واحدة. بعد ذلك تدخل بالجوال وكلمة المرور فقط.'
          : 'أدخل كلمة المرور لتسجيل الدخول مباشرة.'}
      </p>
      {error && <div className="login-error" role="alert"><p>{error}</p></div>}
      <div className="login-field">
        <label htmlFor="teacher-login-phone" className="login-field-label">رقم الجوال</label>
        <input id="teacher-login-phone" className="login-input" type="tel" inputMode="tel" autoComplete="username" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" disabled={busy || step !== 'phone'} />
      </div>
      {step === 'setup' && <div className="login-field">
        <label htmlFor="teacher-activation-code" className="login-field-label">كود التفعيل الموحّد</label>
        <input id="teacher-activation-code" className="login-input" type="text" value={code} onChange={e => setCode(e.target.value)} required maxLength={64} autoComplete="off" spellCheck={false} dir="ltr" disabled={busy} placeholder="الكود الذي تسلّمته من الإدارة" />
      </div>}
      {step !== 'phone' && <div className="login-field">
        <label htmlFor="teacher-login-password" className="login-field-label">{step === 'setup' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}</label>
        <div className="login-input-wrap">
          <input id="teacher-login-password" className="login-input login-input--password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={step === 'setup' ? 8 : undefined} maxLength={1024} autoComplete={step === 'setup' ? 'new-password' : 'current-password'} disabled={busy} />
          <button type="button" className="login-password-toggle" disabled={busy} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>}
      {step === 'setup' && <div className="login-field">
        <label htmlFor="teacher-password-confirmation" className="login-field-label">تأكيد كلمة المرور</label>
        <input id="teacher-password-confirmation" className="login-input" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={8} maxLength={1024} autoComplete="new-password" disabled={busy} />
      </div>}
      <button type="submit" className="login-submit" disabled={busy}>{pending ? 'جاري المتابعة...' : step === 'phone' ? 'متابعة' : step === 'setup' ? 'حفظ كلمة المرور والدخول' : 'تسجيل الدخول'}</button>
      {step !== 'phone' && <button type="button" className="login-link-btn" disabled={busy} onClick={changePhone}>تغيير رقم الجوال</button>}
      {step === 'password' && <p className="login-hint">إذا نسيت كلمة المرور، تواصل مع إدارة المدرسة لإعادة تعيينها.</p>}
    </form>
  );
}
