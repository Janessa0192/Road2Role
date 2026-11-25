// The robot teacher's face and body, drawn as one inline SVG.
//
// It needs ONE input: `state` = 'idle' | 'speaking' | 'listening' | 'thinking'.
// All the movement lives in components/robot-classroom.css (keyed on data-state), so a Rive
// animation (@rive-app/react-canvas, a state machine with the same four states) can replace
// this file later without touching the classroom screen.
const LABELS = {
  idle: 'The robot teacher is waiting',
  speaking: 'The robot teacher is speaking',
  listening: 'The robot teacher is listening',
  thinking: 'The robot teacher is thinking',
};

export default function RobotAvatar({ state = 'idle' }) {
  return (
    <svg className="rb" data-state={state} viewBox="0 0 320 380" role="img" aria-label={LABELS[state] || LABELS.idle} xmlns="http://www.w3.org/2000/svg">
      <ellipse className="rb-shadow" cx="160" cy="364" rx="72" ry="9" />

      <g className="rb-float">
        {/* body + arms */}
        <g className="rb-arm rb-arm-left">
          <rect x="64" y="226" width="26" height="72" rx="13" />
          <circle cx="77" cy="304" r="15" />
        </g>
        <g className="rb-arm rb-arm-right">
          <rect x="230" y="226" width="26" height="72" rx="13" />
          <circle cx="243" cy="304" r="15" />
        </g>
        <rect className="rb-neck" x="144" y="196" width="32" height="20" rx="8" />
        <rect className="rb-body" x="95" y="208" width="130" height="120" rx="38" />
        <circle className="rb-light" cx="160" cy="264" r="15" />
        <rect className="rb-vent" x="138" y="298" width="44" height="6" rx="3" />

        {/* head */}
        <g className="rb-head-group">
          <line className="rb-antenna" x1="160" y1="54" x2="160" y2="26" />
          <circle className="rb-bulb" cx="160" cy="18" r="9" />

          <rect className="rb-ear" x="50" y="106" width="24" height="52" rx="12" />
          <rect className="rb-ear" x="246" y="106" width="24" height="52" rx="12" />
          <path className="rb-wave rb-wave-l" d="M40 114 Q28 132 40 150" />
          <path className="rb-wave rb-wave-r" d="M280 114 Q292 132 280 150" />

          <rect className="rb-head" x="68" y="54" width="184" height="152" rx="46" />
          <rect className="rb-screen" x="90" y="78" width="140" height="104" rx="32" />

          <g className="rb-eyes">
            <g className="rb-eye">
              <ellipse className="rb-pupil" cx="130" cy="122" rx="13" ry="16" />
              <circle className="rb-shine" cx="125" cy="115" r="4" />
            </g>
            <g className="rb-eye">
              <ellipse className="rb-pupil" cx="190" cy="122" rx="13" ry="16" />
              <circle className="rb-shine" cx="185" cy="115" r="4" />
            </g>
          </g>

          <circle className="rb-cheek" cx="108" cy="152" r="9" />
          <circle className="rb-cheek" cx="212" cy="152" r="9" />
          <path className="rb-smile" d="M140 152 Q160 170 180 152" />
          <ellipse className="rb-talk" cx="160" cy="158" rx="15" ry="3" />

          <g className="rb-think">
            <circle cx="238" cy="42" r="5" />
            <circle cx="256" cy="30" r="6.5" />
            <circle cx="278" cy="16" r="8" />
          </g>
        </g>
      </g>
    </svg>
  );
}
