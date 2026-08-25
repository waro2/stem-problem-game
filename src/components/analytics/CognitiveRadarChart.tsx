/**
 * CognitiveRadarChart — 6-axis cognitive profile for one student
 * (Réussite, Efficacité, Autonomie, Métacognition, Vitesse, Score).
 */

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import type { StudentSessionRow } from '@api/instructor';
import { computeCognitiveMetrics } from './cognitiveMetrics';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface CognitiveRadarChartProps {
  sessions: StudentSessionRow[];
  studentName: string;
  lang?: Lang;
}

export function CognitiveRadarChart({ sessions, studentName, lang = 'fr' }: CognitiveRadarChartProps) {
  const metrics = computeCognitiveMetrics(sessions);

  const data = [
    { subject: t('radarSubjectReussite', lang), value: metrics.reussite },
    { subject: t('radarSubjectEfficacite', lang), value: metrics.efficacite },
    { subject: t('radarSubjectAutonomie', lang), value: metrics.autonomie },
    { subject: t('radarSubjectMetacognition', lang), value: metrics.metacognition },
    { subject: t('radarSubjectVitesse', lang), value: metrics.vitesse },
    { subject: t('radarSubjectScore', lang), value: metrics.scoreNorm },
  ];

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#595959', marginBottom: 4 }}>{studentName}</div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#1A4A30" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6BAF8A' }} />
          <Radar
            dataKey="value"
            stroke="#185FA5"
            fill="#185FA5"
            fillOpacity={0.25}
            dot={{ r: 3, fill: '#185FA5' }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
