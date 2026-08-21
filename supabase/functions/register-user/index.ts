// Supabase Edge Function: register-user
// التسجيل العام لطلاب/أولياء الأمور مُغلق — الحسابات من إدارة المدرسة فقط.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error: 'التسجيل العام مغلق. تواصل مع إدارة المدرسة لإنشاء الحساب.',
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
