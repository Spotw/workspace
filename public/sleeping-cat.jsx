import React from "react";

export default function SleepingCat() {
  return (
    <svg className="sleeping-cat" viewBox="0 0 220 140" aria-hidden="true">
      <defs>
        <linearGradient id="cat-fur" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f2d6aa" />
          <stop offset="1" stopColor="#c58b58" />
        </linearGradient>
        <linearGradient id="cat-patch" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff0d4" />
          <stop offset="1" stopColor="#e9c99d" />
        </linearGradient>
      </defs>
      <ellipse cx="119" cy="124" rx="76" ry="8" fill="#21160f" opacity=".2" />
      <g className="cat-tail">
        <path d="M164 103c31 14 53-4 42-27-7-15-28-15-32-2-3 9 5 16 13 12" fill="none" stroke="#b87b4d" strokeLinecap="round" strokeWidth="17" />
        <path d="M164 99c28 11 44-5 34-20-5-8-16-9-21-3" fill="none" stroke="#e6bb85" strokeLinecap="round" strokeWidth="8" />
      </g>
      <g className="cat-body">
        <path d="M48 103c-4-25 16-49 48-55 38-7 75 9 85 34 10 24-4 43-30 45l-82-2c-12 0-19-8-21-22Z" fill="url(#cat-fur)" />
        <path d="M104 60c8 13 9 28 2 38m29-38c8 12 9 23 5 34" fill="none" stroke="#ae7449" strokeLinecap="round" strokeWidth="5" opacity=".42" />
        <path d="M99 117c12-12 34-13 48-1-8 9-35 11-48 1Z" fill="url(#cat-patch)" opacity=".9" />
        <ellipse cx="81" cy="115" rx="15" ry="8" fill="#e9c99d" />
        <ellipse cx="143" cy="117" rx="16" ry="8" fill="#e9c99d" />
      </g>
      <g className="cat-head">
        <path d="m47 70-2-22 20 12m6 0 20-12-3 25" fill="#c58b58" stroke="#c58b58" strokeLinejoin="round" strokeWidth="5" />
        <path d="m51 64-1-9 10 7m16 0 10-7-1 12" fill="#e9b9a1" />
        <ellipse cx="67" cy="81" rx="28" ry="24" fill="url(#cat-fur)" />
        <path d="M54 82q5 6 10 0m8 0q5 6 10 0" fill="none" stroke="#704b35" strokeLinecap="round" strokeWidth="2.5" />
        <path d="m65 88 4 3 4-3" fill="#a96867" stroke="#a96867" strokeLinejoin="round" strokeWidth="1.5" />
        <path d="m56 91-13 2m13 2-12 5m37-7 13 2m-13 3 12 5" fill="none" stroke="#966b4e" strokeLinecap="round" strokeWidth="1.5" opacity=".8" />
      </g>
      <g className="cat-zzz" fill="#f3d9ac" fontFamily="Georgia, serif" fontWeight="bold">
        <text x="27" y="46" fontSize="18">z</text>
        <text x="14" y="31" fontSize="13">z</text>
      </g>
    </svg>
  );
}
