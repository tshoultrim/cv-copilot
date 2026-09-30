import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useResumeStore } from "../hooks/useResumeData";

const ACCENT = "#00D2FF";

export default function SkillsRadar() {
  const { data } = useResumeStore();
  const { SKILLS } = data;

  // Chart Data format
  const radarData = SKILLS.map(s => ({
    subject: s.name,
    A: s.level,
    fullMark: 100
  })).slice(0, 6); // Max 6 for a clean radar

  return (
    <div className="w-full aspect-square min-h-[220px] max-h-[300px] relative mt-2">
      <p className="absolute top-0 left-0 font-mono text-[9px] text-synapse/70 tracking-widest uppercase">
        Skills Matrix // Radar
      </p>
      <div className="w-full h-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.15)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'monospace' }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar 
              name="Skills" 
              dataKey="A" 
              stroke={ACCENT} 
              strokeWidth={2}
              fill={ACCENT} 
              fillOpacity={0.3} 
              isAnimationActive={true}
              animationDuration={800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
