interface Props {
  active: boolean;
}

export default function VoiceOrb({ active }: Props) {
  return (
    <div className={`voice-orb ${active ? 'active' : ''}`}>
      <div className="voice-orb-ring" />
      <div className="voice-orb-ring" />
      <div className="voice-orb-core" />
    </div>
  );
}
