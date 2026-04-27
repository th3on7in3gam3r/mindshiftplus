# 🚀 Quick Reference: AI Scribe + EHR Integration

## ⚡ Quick Start

### 1. Apply Database Migrations
```bash
# Migrations auto-apply in Supabase
# Or manually run:
psql -d your_db -f supabase/migrations/ai_scribe_tables.sql
```

### 2. Start the App
```bash
npm run dev
```

### 3. Use AI Scribe
```
1. Log in as admin
2. Admin Menu → 🎙️ AI Scribe
3. Create session → Record → Push to EHR
4. View in EHR → Patient Chart → 🎙️ AI Scribe tab
```

---

## 📋 Key Functions

### Create Session
```javascript
import { createScribeSession } from './lib/aiScribeDb';

const { data, error } = await createScribeSession({
  patientId: "12345",
  providerName: "Dr. Smith",
  sessionType: "Follow-up",
  modality: "Telehealth",
  specialty: "psychiatry"
});
```

### Save Note
```javascript
import { saveGeneratedNote } from './lib/aiScribeDb';

await saveGeneratedNote(
  sessionId,
  "PSYCHIATRIC PROGRESS NOTE...",
  95  // quality score
);
```

### Push to EHR
```javascript
import { pushToEHR } from './lib/aiScribeDb';

const { data, error } = await pushToEHR(sessionId);
// Note automatically added to patient chart
```

### Get Patient Notes
```javascript
import { getPatientScribeSessions } from './lib/aiScribeDb';

const { data, error } = await getPatientScribeSessions("12345");
// Returns all AI Scribe sessions for patient
```

---

## 🗂️ Database Tables

### ai_scribe_sessions
Main table for all sessions
- Links to EHR via `patient_chart_id`
- Stores transcript, note, quality score
- Tracks status: draft → completed → pushed_to_ehr

### ai_scribe_templates
Note templates (4 pre-loaded)
- Psychiatric Progress Note
- Initial Psychiatric Evaluation
- Therapy Session Note
- Medication Management Visit

### ai_scribe_audit_log
Complete audit trail
- All actions logged
- HIPAA compliance ready

---

## 🎯 Workflow

```
AI Scribe → Database → EHR → Patient Chart
```

1. **Create** session in AI Scribe
2. **Record** and generate note
3. **Push** to EHR (one click)
4. **View** in patient chart AI Scribe tab

---

## 🔐 Security

### Row Level Security
```sql
-- Only providers see their own sessions
auth.uid() = provider_id
```

### Audit Logging
Every action tracked:
- created
- updated
- pushed_to_ehr
- downloaded
- copied
- deleted

---

## 📊 Statistics

Access via:
```javascript
import { getProviderScribeStats } from './lib/aiScribeDb';

const { data } = await getProviderScribeStats();
// Returns: total, this_week, avg_quality_score, etc.
```

---

## 🎨 UI Components

### AI Scribe Main
- `src/components/AIScribe.jsx`
- Session setup, recording, note generation
- Archive sidebar with filters
- Statistics dashboard

### EHR Integration
- `src/components/ehr/EHRScribeNotes.jsx`
- Patient-specific notes viewer
- Expandable notes
- Copy/download actions

### Patient Chart Tab
- `src/components/ehr/EHRPatientChart.jsx`
- New tab: 🎙️ AI Scribe
- Shows all AI Scribe notes for patient

---

## 🐛 Troubleshooting

### Sessions not saving?
- Check database migrations applied
- Verify user authenticated
- Check browser console for errors

### Can't push to EHR?
- Verify `patient_chart_id` exists
- Check RLS policies active
- Ensure session status is 'completed'

### Notes not showing in EHR?
- Verify patient ID matches
- Check EHR tab is visible
- Refresh patient chart

---

## 📁 File Structure

```
supabase/migrations/
  └── ai_scribe_tables.sql          ← Database schema

src/lib/
  └── aiScribeDb.js                 ← Database functions

src/components/
  ├── AIScribe.jsx                  ← Main AI Scribe
  └── ehr/
      ├── EHRScribeNotes.jsx        ← EHR notes viewer
      └── EHRPatientChart.jsx       ← Patient chart (updated)
```

---

## ✅ Testing Checklist

- [ ] Create session
- [ ] Record session
- [ ] Generate note
- [ ] Push to EHR
- [ ] View in patient chart
- [ ] Load from archive
- [ ] Delete session
- [ ] Check statistics

---

## 🎓 Default Templates

1. **Psychiatric Progress Note** (Follow-up)
2. **Initial Psychiatric Evaluation** (Initial)
3. **Therapy Session Note** (Therapy)
4. **Medication Management Visit** (Med Management)

---

## 💡 Pro Tips

### For Clinicians
- Fill out patient info before recording
- Use clinical context for better notes
- Review quality score before pushing
- Archive old sessions regularly

### For Developers
- Use RLS policies for security
- Log all actions for compliance
- Index frequently queried fields
- Monitor database performance

---

## 📞 Quick Help

**Can't see AI Scribe in menu?**
→ Log in with admin email

**Session not creating?**
→ Check database connection

**Push to EHR failing?**
→ Verify patient chart exists

**Notes not loading?**
→ Check patient ID matches

---

## 🚀 Next Steps

1. ✅ Test the integration
2. ✅ Train staff on workflow
3. ✅ Gather feedback
4. ✅ Monitor usage statistics
5. ✅ Plan API integrations

---

**Need more details?**
→ Read `AI_SCRIBE_EHR_INTEGRATION_COMPLETE.md`

**Questions?**
→ info@mindshiftwellnessclinic.org

---

*Quick reference for MindShift AI Scribe + EHR Integration*
