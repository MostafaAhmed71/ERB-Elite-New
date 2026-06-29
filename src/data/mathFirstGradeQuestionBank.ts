/** بنك أسئلة الرياضيات — أول متوسط (15 سؤال لكل مهارة × 7 مهارات) */

export const MATH_GRADE = 'أول متوسط';
export const MATH_SUBJECT = 'الرياضيات';

export interface SeedQuestion {
  type: 'MCQ' | 'TF';
  question_text: string;
  options?: string[];
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SkillQuestionBank {
  skill_name: string;
  questions: SeedQuestion[];
}

export const MATH_FIRST_GRADE_BANK: SkillQuestionBank[] = [
  {
    skill_name: 'الأعداد الطبيعية',
    questions: [
      { type: 'MCQ', question_text: 'ما قيمة الرقم 7 في العدد 3,752؟', options: ['7', '70', '700', '7000'], correct_answer: '700', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'أي العددين أكبر: 4,589 أم 4,598؟', options: ['4,589', '4,598', 'متساويان', 'لا يمكن المقارنة'], correct_answer: '4,598', difficulty: 'easy' },
      { type: 'TF', question_text: 'العدد 0 يُعدّ عدداً طبيعياً في هذا المنهج.', correct_answer: 'false', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'اكتب العدد «خمسة آلاف ومئة وثلاثة» بالأرقام:', options: ['5,103', '5,013', '5,130', '5,310'], correct_answer: '5,103', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما العدد التالي في المتتالية: 2, 4, 6, 8, ...؟', options: ['9', '10', '11', '12'], correct_answer: '10', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'أي عدد هو الأقرب إلى 1,000؟', options: ['987', '1,012', '1,050', '950'], correct_answer: '987', difficulty: 'medium' },
      { type: 'TF', question_text: 'كل عدد زوجي يقبل القسمة على 2.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما مجموع أول خمسة أعداد طبيعية؟', options: ['10', '15', '20', '25'], correct_answer: '15', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'رتّب الأعداد تصاعدياً: 456، 465، 654', options: ['456، 465، 654', '654، 465، 456', '465، 456، 654', '456، 654، 465'], correct_answer: '456، 465، 654', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'كم خانة في العدد 12,345؟', options: ['3', '4', '5', '6'], correct_answer: '5', difficulty: 'easy' },
      { type: 'TF', question_text: 'العدد 1,000,000 يساوي مليون.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما الفرق بين 8,000 و 5,750؟', options: ['2,150', '2,250', '2,350', '3,250'], correct_answer: '2,250', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'أي عدد يقع بين 299 و 301؟', options: ['298', '300', '302', '303'], correct_answer: '300', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما قيمة 10³؟', options: ['30', '100', '1,000', '10,000'], correct_answer: '1,000', difficulty: 'medium' },
      { type: 'TF', question_text: 'الأعداد الطبيعية لا نهائية.', correct_answer: 'true', difficulty: 'easy' },
    ],
  },
  {
    skill_name: 'جداول الضرب والقسمة',
    questions: [
      { type: 'MCQ', question_text: 'كم يساوي 7 × 8؟', options: ['54', '56', '58', '64'], correct_answer: '56', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 72 ÷ 9؟', options: ['6', '7', '8', '9'], correct_answer: '8', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'أي مما يلي يساوي 12 × 5؟', options: ['50', '55', '60', '65'], correct_answer: '60', difficulty: 'easy' },
      { type: 'TF', question_text: 'القسمة على 1 تعطي نفس العدد.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 11 × 11؟', options: ['111', '121', '131', '144'], correct_answer: '121', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'إذا كان 6 × ؟ = 54، فما العدد الناقص؟', options: ['7', '8', '9', '10'], correct_answer: '9', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'كم يساوي 15 × 4؟', options: ['50', '55', '60', '65'], correct_answer: '60', difficulty: 'easy' },
      { type: 'TF', question_text: 'أي عدد مضروباً في 0 يساوي 0.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 100 ÷ 4؟', options: ['20', '25', '30', '40'], correct_answer: '25', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 9 × 12؟', options: ['98', '102', '108', '118'], correct_answer: '108', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'أي تعبير يساوي 48؟', options: ['6 × 6', '8 × 6', '7 × 7', '9 × 5'], correct_answer: '8 × 6', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 144 ÷ 12؟', options: ['10', '11', '12', '13'], correct_answer: '12', difficulty: 'medium' },
      { type: 'TF', question_text: 'الضرب عملية عكسية للقسمة عندما تكون القسمة دون باقٍ.', correct_answer: 'true', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'كم علبة تحتاج لتوزيع 35 قلماً بحيث تحصل كل علبة على 7 أقلام؟', options: ['4', '5', '6', '7'], correct_answer: '5', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'ما ناتج 25 × 8؟', options: ['150', '180', '200', '250'], correct_answer: '200', difficulty: 'medium' },
    ],
  },
  {
    skill_name: 'الأعداد والعمليات الحسابية',
    questions: [
      { type: 'MCQ', question_text: 'ما ناتج 456 + 278؟', options: ['724', '734', '744', '754'], correct_answer: '734', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 1,000 − 347؟', options: ['553', '643', '653', '663'], correct_answer: '653', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج (25 + 15) × 2؟', options: ['70', '75', '80', '85'], correct_answer: '80', difficulty: 'medium' },
      { type: 'TF', question_text: 'الجمع عملية إبدالية: 3 + 5 = 5 + 3.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'اشترى أحمد 3 دفاتر بـ 12 ريالاً للدفتر. كم دفع؟', options: ['24', '30', '36', '42'], correct_answer: '36', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'ما ناتج 125 × 4؟', options: ['400', '450', '500', '550'], correct_answer: '500', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 840 ÷ 7؟', options: ['110', '120', '130', '140'], correct_answer: '120', difficulty: 'medium' },
      { type: 'TF', question_text: 'الطرح ليس عملية إبدالية.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما قيمة 50 − 3 × 4؟', options: ['38', '42', '188', '200'], correct_answer: '38', difficulty: 'hard' },
      { type: 'MCQ', question_text: 'مع سالم 200 ريال وأنفق 75 ريالاً. كم بقي معه؟', options: ['115', '125', '135', '145'], correct_answer: '125', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 99 + 47؟', options: ['136', '146', '156', '166'], correct_answer: '146', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'أي تعبير يمثل «ضعف العدد 15 مزيداً 10»؟', options: ['15 + 10', '15 × 2 + 10', '15 × 10', '15 + 2 + 10'], correct_answer: '15 × 2 + 10', difficulty: 'medium' },
      { type: 'TF', question_text: 'الضرب له أولوية على الجمع في ترتيب العمليات.', correct_answer: 'true', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'ما ناتج 2,500 − 1,875؟', options: ['525', '625', '725', '825'], correct_answer: '625', difficulty: 'hard' },
      { type: 'MCQ', question_text: 'قسّم 96 تفاحة بالتساوي على 8 صناديق. كم في كل صندوق؟', options: ['10', '11', '12', '13'], correct_answer: '12', difficulty: 'easy' },
    ],
  },
  {
    skill_name: 'الكسور والأعداد العشرية',
    questions: [
      { type: 'MCQ', question_text: 'أي كسر يمثل نصف دائرة؟', options: ['1/4', '1/2', '2/3', '3/4'], correct_answer: '1/2', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما الكسر المكافئ لـ 2/4؟', options: ['1/2', '1/3', '2/5', '3/4'], correct_answer: '1/2', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 1/4 + 1/4؟', options: ['1/8', '2/4', '1/2', '2/8'], correct_answer: '1/2', difficulty: 'medium' },
      { type: 'TF', question_text: '0.5 يساوي 1/2.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'رتّب الكسور تصاعدياً: 1/2، 1/4، 3/4', options: ['1/4، 1/2، 3/4', '3/4، 1/2، 1/4', '1/2، 1/4، 3/4', '1/4، 3/4، 1/2'], correct_answer: '1/4، 1/2، 3/4', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'اكتب الكسر 3/10 كعدد عشري:', options: ['0.03', '0.3', '0.33', '3.10'], correct_answer: '0.3', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما ناتج 2.5 + 1.75؟', options: ['3.25', '4.00', '4.25', '4.75'], correct_answer: '4.25', difficulty: 'medium' },
      { type: 'TF', question_text: 'المقام في الكسر يبيّن عدد الأجزاء الكلية.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'أي عدد عشري أكبر: 0.45 أم 0.54؟', options: ['0.45', '0.54', 'متساويان', 'لا يمكن المقارنة'], correct_answer: '0.54', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما الكسر البسيط لـ 6/9؟', options: ['1/3', '2/3', '3/4', '6/9'], correct_answer: '2/3', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'ما ناتج 5 − 2.3؟', options: ['2.3', '2.7', '3.3', '3.7'], correct_answer: '2.7', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'كم يعادل 3/5 كعدد عشري؟', options: ['0.35', '0.53', '0.6', '0.75'], correct_answer: '0.6', difficulty: 'medium' },
      { type: 'TF', question_text: 'الكسر 5/5 يساوي 1.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'أكلت سارة 1/3 من البيتزا وأكل أخوها 1/6. ما الكسر المأكول؟', options: ['1/9', '2/9', '1/2', '2/3'], correct_answer: '1/2', difficulty: 'hard' },
      { type: 'MCQ', question_text: 'ما ناتج 0.8 × 10؟', options: ['0.08', '8', '80', '800'], correct_answer: '8', difficulty: 'easy' },
    ],
  },
  {
    skill_name: 'النسب والتناسب',
    questions: [
      { type: 'MCQ', question_text: 'ما النسبة بين 2 و 8 بأبسط صورة؟', options: ['1:2', '1:4', '2:4', '4:1'], correct_answer: '1:4', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'إذا كان 3 أقلام تكلف 6 ريالات، فكم تكلف 5 أقلام؟', options: ['8', '9', '10', '12'], correct_answer: '10', difficulty: 'medium' },
      { type: 'TF', question_text: 'النسبة 2:3 تعني لكل 2 جزء من الأول يقابل 3 من الثاني.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'في فصل 20 طالباً، 12 منهم بنات. ما نسبة البنات؟', options: ['12/20', '8/20', '12/8', '20/12'], correct_answer: '12/20', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'إذا خلطت 2 لتر ماء مع 1 لتر عصير، فما نسبة الماء إلى العصير؟', options: ['1:2', '2:1', '2:3', '3:2'], correct_answer: '2:1', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'سيارة تستهلك 4 لترات لكل 100 كم. كم لتراً لـ 50 كم؟', options: ['1', '2', '3', '4'], correct_answer: '2', difficulty: 'medium' },
      { type: 'TF', question_text: 'إذا تضاعف الطول والعرض، تتضاعف المساحة 4 مرات.', correct_answer: 'true', difficulty: 'hard' },
      { type: 'MCQ', question_text: 'ما العدد الناقص: 4 : 6 = 8 : ؟', options: ['10', '12', '14', '16'], correct_answer: '12', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'طبّاخ يحتاج 3 بيضات لعمل 12 كعكة. كم بيضة لـ 20 كعكة؟', options: ['4', '5', '6', '7'], correct_answer: '5', difficulty: 'hard' },
      { type: 'MCQ', question_text: 'بسّط النسبة 15:25', options: ['1:2', '3:5', '5:3', '15:25'], correct_answer: '3:5', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'إذا كان 5 عمال ينهون عملاً في 10 أيام، فكم يوماً لعامل واحد بنفس المعدل؟', options: ['2', '5', '10', '50'], correct_answer: '50', difficulty: 'hard' },
      { type: 'TF', question_text: 'النسبة المتكافئة لها نفس القيمة عند التبسيط.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'خريطة مقياسها 1 سم = 5 كم. كم يمثل 3 سم؟', options: ['8 كم', '10 كم', '15 كم', '20 كم'], correct_answer: '15 كم', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'ما نسبة 25 إلى 100؟', options: ['1:2', '1:3', '1:4', '1:5'], correct_answer: '1:4', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'زاد سعر سلعة من 40 إلى 50 ريالاً. ما مقدار الزيادة؟', options: ['5', '10', '15', '20'], correct_answer: '10', difficulty: 'easy' },
    ],
  },
  {
    skill_name: 'الهندسة والقياس',
    questions: [
      { type: 'MCQ', question_text: 'كم ضلعاً لمثلث؟', options: ['2', '3', '4', '5'], correct_answer: '3', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما محيط مربع طول ضلعه 5 سم؟', options: ['10 سم', '15 سم', '20 سم', '25 سم'], correct_answer: '20 سم', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما مساحة مستطيل طوله 8 سم وعرضه 3 سم؟', options: ['11 سم²', '22 سم²', '24 سم²', '32 سم²'], correct_answer: '24 سم²', difficulty: 'easy' },
      { type: 'TF', question_text: 'مجموع زوايا المثلث يساوي 180°.', correct_answer: 'true', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'أي شكل له 4 أضلاع متساوية و4 زوايا قائمة؟', options: ['مستطيل', 'مربع', 'معين', 'مثلث'], correct_answer: 'مربع', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'كم سم في المتر؟', options: ['10', '100', '1,000', '10,000'], correct_answer: '100', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما محيط مستطيل طوله 12 م وعرضه 5 م؟', options: ['17 م', '34 م', '60 م', '120 م'], correct_answer: '34 م', difficulty: 'medium' },
      { type: 'TF', question_text: 'الزاوية القائمة قياسها 90°.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما مساحة مربع طول ضلعه 7 سم؟', options: ['14 سم²', '28 سم²', '49 سم²', '56 سم²'], correct_answer: '49 سم²', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'أي وحدة أنسب لقياس طول غرفة؟', options: ['مليمتر', 'سنتيمتر', 'متر', 'كيلومتر'], correct_answer: 'متر', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما نوع الزاوية التي قياسها 45°؟', options: ['حادة', 'قائمة', 'منفرجة', 'مستقيمة'], correct_answer: 'حادة', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'محيط دائرة نصف قطرها 7 سم تقريباً (π ≈ 22/7)؟', options: ['22 سم', '44 سم', '49 سم', '154 سم'], correct_answer: '44 سم', difficulty: 'hard' },
      { type: 'TF', question_text: 'المساحة تُقاس بوحدات مربعة.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'مثلث قائم الزاوية أحد ضلعيه 3 سم والآخر 4 سم. ما طول الوتر؟', options: ['5 سم', '6 سم', '7 سم', '8 سم'], correct_answer: '5 سم', difficulty: 'hard' },
      { type: 'MCQ', question_text: 'كم مليمتراً في 2.5 سم؟', options: ['0.25', '25', '250', '2,500'], correct_answer: '25', difficulty: 'medium' },
    ],
  },
  {
    skill_name: 'الإحصاء والاحتمالات',
    questions: [
      { type: 'MCQ', question_text: 'ما الوسط الحسابي للأعداد: 4، 6، 8؟', options: ['5', '6', '7', '8'], correct_answer: '6', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'في الرسم البياني بالأعمدة، ماذا تمثل الأعمدة؟', options: ['الفئات والتكرارات', 'الزوايا فقط', 'المساحات فقط', 'الأطوال فقط'], correct_answer: 'الفئات والتكرارات', difficulty: 'easy' },
      { type: 'TF', question_text: 'المنوال هو أكثر قيمة تكراراً.', correct_answer: 'true', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'رمي حجر نرد عادل. ما احتمال ظهور العدد 3؟', options: ['1/2', '1/3', '1/6', '1/12'], correct_answer: '1/6', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'رتّب الأعداد لإيجاد الوسيط: 2، 5، 7، 9، 12', options: ['5', '7', '9', '12'], correct_answer: '7', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'في كيس 3 كرات حمراء و 2 زرقاء. ما احتمال سحب كرة حمراء؟', options: ['2/5', '3/5', '1/2', '3/2'], correct_answer: '3/5', difficulty: 'medium' },
      { type: 'TF', question_text: 'احتمال حدث مستحيل يساوي 0.', correct_answer: 'true', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما المدى في البيانات: 10، 15، 8، 20؟', options: ['10', '12', '15', '20'], correct_answer: '12', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'أي رسم يُستخدم لمقارنة أجزاء من كل؟', options: ['الأعمدة', 'الخطوط', 'الدائري', 'النقطي'], correct_answer: 'الدائري', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'احتمال ظهور رأس عند رمي عملة معدنية عادلة؟', options: ['1/4', '1/3', '1/2', '1'], correct_answer: '1/2', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'متوسط درجات طالب: 80، 90، 70. ما المتوسط؟', options: ['75', '80', '85', '90'], correct_answer: '80', difficulty: 'easy' },
      { type: 'TF', question_text: 'مجموع احتمالات جميع النتائج في تجربة عادلة يساوي 1.', correct_answer: 'true', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'في جدول: 5 طلاب حصلوا على 10، و3 على 8. كم عدد الطلاب؟', options: ['5', '8', '10', '15'], correct_answer: '8', difficulty: 'easy' },
      { type: 'MCQ', question_text: 'ما الوسيط للأعداد: 3، 3، 5، 7، 9؟', options: ['3', '5', '7', '9'], correct_answer: '5', difficulty: 'medium' },
      { type: 'MCQ', question_text: 'كيس فيه 4 أبيض و 4 أسود. احتمال سحب أسود؟', options: ['1/8', '1/4', '1/2', '3/4'], correct_answer: '1/2', difficulty: 'easy' },
    ],
  },
];
