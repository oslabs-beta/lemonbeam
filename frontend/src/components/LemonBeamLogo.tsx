

function LemonBeamLogo() {
    return (
        <svg
        className="lemonbeam-logo"
        width="120"
        height="112"
        viewBox="0 0 300 280"
        aria-hidden="true"
        >
        <defs>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
            </filter>
        </defs>

        <linearGradient id="beamSweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="45%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.85" />
            <stop offset="55%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* soft glow behind the mark */}
        <ellipse
            cx="150"
            cy="150"
            rx="130"
            ry="120"
            fill="#F5D826"
            opacity="0.18"
            filter="url(#glow)"
        />

        <g filter="url(#glow)">
            <polygon points="150,20 132.86,54.29 167.14,54.29" fill="#FFFFFF" />
            <polygon
            points="132.86,54.29 167.14,54.29 184.29,88.57 115.71,88.57"
            fill="#FDF6B2"
            />
            <polygon
            points="115.71,88.57 184.29,88.57 201.43,122.86 98.57,122.86"
            fill="#FCEB6B"
            />
            <polygon
            points="98.57,122.86 201.43,122.86 218.57,157.14 81.43,157.14"
            fill="#F5D826"
            />
            <polygon
            points="81.43,157.14 218.57,157.14 235.71,191.43 64.29,191.43"
            fill="#E8C412"
            />
            <polygon
            points="64.29,191.43 235.71,191.43 252.86,225.71 47.14,225.71"
            fill="#D1A70C"
            />
            <polygon
            points="47.14,225.71 252.86,225.71 270,260 30,260"
            fill="#B8930A"
            />

            {/* right-facet shading for a faceted, dimensional look */}
            <polygon
            points="150,20 150,260 270,260"
            fill="#000000"
            opacity="0.15"
            />
            {/* center facet line */}
            <line
            x1="150"
            y1="20"
            x2="150"
            y2="260"
            stroke="#000000"
            strokeOpacity="0.15"
            strokeWidth="1"
            />
        </g>

        <polygon
            className="beam-sweep"
            points="150,20 270,260 30,260"
            fill="url(#beamSweep)"
            opacity="0.7"
        />
        </svg>
    );
}

export default LemonBeamLogo;