-- Default export template overlay positions (homework cards + weekly plan table)
INSERT INTO public.academic_config (key, value) VALUES
  ('export_template_layout', '{
    "version": 1,
    "homework": {
      "subtitle": { "top": 232, "left": 62, "right": 62, "fontSize": 12 },
      "content": { "top": 254, "left": 64, "right": 64, "bottom": 96 },
      "grid": { "gap": 7, "columns": 2 },
      "card": { "height": 112, "emptyHeight": 72, "bodyPadding": 5, "periodSize": 20, "barPadding": 4 },
      "fonts": { "subject": 12, "detail": 9, "bar": 9, "topic": 12, "homeworkText": 11, "teacher": 11 }
    },
    "weeklyPlan": {
      "meta": { "top": 176, "left": 62, "right": 62, "classFontSize": 12, "weekFontSize": 13 },
      "content": { "top": 218, "left": 64, "right": 64, "bottom": 118 },
      "table": { "fontSize": 10.5, "headerFontSize": 11, "cellPadding": 3, "dayColWidth": 54, "periodColWidth": 62, "subjectColWidth": 102, "rowHeight": 0, "headerHeight": 0 }
    }
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
