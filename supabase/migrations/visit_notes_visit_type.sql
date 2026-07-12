-- Add visit_type to visit_notes (Admin Dashboard → Visit Notes)
alter table visit_notes
  add column if not exists visit_type text;
