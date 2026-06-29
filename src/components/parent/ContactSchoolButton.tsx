import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle } from 'lucide-react';
import { fetchSchoolContact, buildContactMailto } from '../../lib/schoolContact';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function ContactSchoolButton() {
  const [open, setOpen] = useState(false);
  const { data: contact } = useQuery({
    queryKey: ['school-contact'],
    queryFn: fetchSchoolContact,
  });

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<MessageCircle className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        تواصل مع المدرسة
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="تواصل مع المدرسة" size="sm">
        <div className="space-y-3 text-sm" dir="rtl">
          <p className="text-white/60 text-xs">اختر نوع الاستفسار لفتح رسالة جاهزة:</p>
          {(['attendance', 'points', 'general'] as const).map((topic) => {
            const labels = {
              attendance: 'استفسار عن الحضور',
              points: 'استفسار عن النقاط',
              general: 'استفسار عام',
            };
            return (
              <a
                key={topic}
                href={contact ? buildContactMailto(contact, topic) : '#'}
                className="flex items-center gap-2 p-3 rounded-xl border border-white/10 hover:border-gold-500/30 hover:bg-white/5 transition-colors text-white/80"
                onClick={() => setOpen(false)}
              >
                <Mail className="w-4 h-4 text-gold-400" />
                {labels[topic]}
              </a>
            );
          })}
          {contact?.phone && (
            <p className="text-white/40 text-xs text-center pt-2">
              أو اتصل: <a href={`tel:${contact.phone}`} className="text-gold-400">{contact.phone}</a>
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
