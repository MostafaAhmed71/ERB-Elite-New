import { useQuery } from '@tanstack/react-query';
import { Phone, Mail } from 'lucide-react';
import { fetchSchoolContact } from '../../lib/schoolContact';

export function ParentContactFooter() {
  const { data: contact } = useQuery({
    queryKey: ['school-contact'],
    queryFn: fetchSchoolContact,
    staleTime: 1000 * 60 * 30,
  });

  if (!contact) return null;
  if (!contact.phone && !contact.activityLeaderEmail) return null;

  return (
    <footer
      className="mt-8 pt-4 border-t border-white/5 text-center text-[10px] text-white/35 space-y-1"
      dir="rtl"
    >
      <p className="font-medium text-white/50">للتواصل مع المدرسة</p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-gold-400 transition-colors">
            <Phone className="w-3 h-3" />
            {contact.phone}
          </a>
        )}
        {contact.activityLeaderEmail && (
          <a
            href={`mailto:${contact.activityLeaderEmail}`}
            className="inline-flex items-center gap-1 hover:text-gold-400 transition-colors"
          >
            <Mail className="w-3 h-3" />
            {contact.activityLeaderName}
          </a>
        )}
      </div>
    </footer>
  );
}
