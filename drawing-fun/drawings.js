// Built-in line drawings as SVG paths
// Each drawing is an SVG string that renders as a coloring-book outline

const DRAWINGS = [
  {
    name: "Cat",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <ellipse cx="200" cy="270" rx="90" ry="75"/>
      <!-- Head -->
      <circle cx="200" cy="150" r="65"/>
      <!-- Ears -->
      <polygon points="150,100 130,55 175,90"/>
      <polygon points="250,100 270,55 225,90"/>
      <!-- Eyes -->
      <ellipse cx="178" cy="138" rx="12" ry="14"/>
      <ellipse cx="222" cy="138" rx="12" ry="14"/>
      <circle cx="181" cy="140" r="5" style="fill:#222;stroke:none"/>
      <circle cx="225" cy="140" r="5" style="fill:#222;stroke:none"/>
      <!-- Nose -->
      <polygon points="200,158 192,168 208,168"/>
      <!-- Mouth -->
      <path d="M192,168 Q200,176 208,168"/>
      <!-- Whiskers -->
      <line x1="140" y1="162" x2="185" y2="165"/>
      <line x1="140" y1="172" x2="185" y2="170"/>
      <line x1="215" y1="165" x2="260" y2="162"/>
      <line x1="215" y1="170" x2="260" y2="172"/>
      <!-- Tail -->
      <path d="M290,310 Q340,260 310,210 Q290,175 310,155"/>
      <!-- Paws -->
      <ellipse cx="155" cy="330" rx="30" ry="18"/>
      <ellipse cx="245" cy="330" rx="30" ry="18"/>
      <!-- Neck -->
      <line x1="175" y1="210" x2="170" y2="200"/>
      <line x1="225" y1="210" x2="230" y2="200"/>
    </svg>`
  },
  {
    name: "Rocket",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,rect,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <path d="M200,40 Q240,80 245,180 L155,180 Q160,80 200,40Z"/>
      <!-- Window -->
      <circle cx="200" cy="140" r="28"/>
      <!-- Wings -->
      <path d="M155,180 L115,260 L155,245 Z"/>
      <path d="M245,180 L285,260 L245,245 Z"/>
      <!-- Base -->
      <path d="M155,245 Q200,235 245,245 L245,280 Q200,270 155,280 Z"/>
      <!-- Flames -->
      <path d="M175,280 Q185,320 200,310 Q215,320 225,280"/>
      <path d="M183,280 Q190,340 200,325 Q210,340 217,280"/>
      <!-- Stars -->
      <path d="M60,80 L64,92 L76,92 L66,100 L70,112 L60,104 L50,112 L54,100 L44,92 L56,92 Z"/>
      <path d="M320,60 L323,70 L333,70 L325,76 L328,86 L320,80 L312,86 L315,76 L307,70 L317,70 Z"/>
      <path d="M340,160 L343,168 L351,168 L345,173 L347,181 L340,176 L333,181 L335,173 L329,168 L337,168 Z"/>
    </svg>`
  },
  {
    name: "Dinosaur",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <ellipse cx="200" cy="260" rx="110" ry="80"/>
      <!-- Neck -->
      <path d="M140,200 Q130,160 150,120"/>
      <path d="M175,195 Q180,155 170,120"/>
      <!-- Head -->
      <ellipse cx="160" cy="105" rx="50" ry="35" transform="rotate(-15,160,105)"/>
      <!-- Eye -->
      <circle cx="145" cy="95" r="10"/>
      <circle cx="148" cy="95" r="4" style="fill:#222;stroke:none"/>
      <!-- Mouth -->
      <path d="M120,115 Q160,125 195,115"/>
      <!-- Teeth -->
      <line x1="135" y1="115" x2="133" y2="122"/>
      <line x1="148" y1="118" x2="147" y2="125"/>
      <line x1="162" y1="118" x2="162" y2="125"/>
      <line x1="176" y1="116" x2="177" y2="122"/>
      <!-- Spikes on back -->
      <polygon points="180,185 170,155 190,175"/>
      <polygon points="205,182 200,148 215,172"/>
      <polygon points="228,185 228,150 240,178"/>
      <polygon points="248,192 252,158 260,186"/>
      <!-- Tail -->
      <path d="M305,280 Q360,290 370,260 Q380,230 350,220"/>
      <!-- Legs -->
      <path d="M155,330 L145,370 L135,370"/>
      <path d="M155,330 L160,370 L170,370"/>
      <path d="M240,330 L230,370 L220,370"/>
      <path d="M240,330 L248,370 L258,370"/>
      <!-- Arms -->
      <path d="M145,230 Q110,225 100,245"/>
      <path d="M100,245 L88,258 M100,245 L95,262"/>
    </svg>`
  },
  {
    name: "House",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,rect,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Main house body -->
      <rect x="70" y="200" width="260" height="170" rx="4"/>
      <!-- Roof -->
      <polygon points="50,205 200,70 350,205"/>
      <!-- Door -->
      <path d="M168,370 L168,290 Q200,278 232,290 L232,370"/>
      <!-- Door knob -->
      <circle cx="224" cy="332" r="5" style="fill:#222;stroke:none"/>
      <!-- Windows -->
      <rect x="90" y="230" width="65" height="55" rx="4"/>
      <line x1="122" y1="230" x2="122" y2="285"/>
      <line x1="90" y1="257" x2="155" y2="257"/>
      <rect x="245" y="230" width="65" height="55" rx="4"/>
      <line x1="277" y1="230" x2="277" y2="285"/>
      <line x1="245" y1="257" x2="310" y2="257"/>
      <!-- Chimney -->
      <rect x="270" y="100" width="36" height="70"/>
      <!-- Smoke -->
      <path d="M278,100 Q268,80 278,65 Q288,50 278,35"/>
      <path d="M295,100 Q305,78 295,60 Q285,42 295,25"/>
      <!-- Path to door -->
      <path d="M168,370 L140,400"/>
      <path d="M232,370 L260,400"/>
      <!-- Grass tufts -->
      <line x1="80" y1="370" x2="72" y2="355"/>
      <line x1="88" y1="370" x2="90" y2="354"/>
      <line x1="310" y1="370" x2="302" y2="355"/>
      <line x1="318" y1="370" x2="320" y2="354"/>
      <!-- Sun -->
      <circle cx="60" cy="60" r="28"/>
      <line x1="60" y1="18" x2="60" y2="8"/>
      <line x1="60" y1="102" x2="60" y2="112"/>
      <line x1="18" y1="60" x2="8" y2="60"/>
      <line x1="102" y1="60" x2="112" y2="60"/>
      <line x1="32" y1="32" x2="25" y2="25"/>
      <line x1="88" y1="32" x2="95" y2="25"/>
    </svg>`
  },
  {
    name: "Fish",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <ellipse cx="185" cy="200" rx="130" ry="85"/>
      <!-- Tail -->
      <path d="M315,200 Q355,155 370,200 Q355,245 315,200Z"/>
      <!-- Eye -->
      <circle cx="100" cy="178" r="20"/>
      <circle cx="104" cy="178" r="8" style="fill:#222;stroke:none"/>
      <!-- Mouth -->
      <path d="M58,200 Q65,215 75,200"/>
      <!-- Scales -->
      <path d="M180,135 Q195,150 180,165"/>
      <path d="M210,130 Q225,147 210,162"/>
      <path d="M240,138 Q253,155 240,170"/>
      <path d="M165,162 Q180,178 165,195"/>
      <path d="M196,157 Q212,173 196,190"/>
      <path d="M227,160 Q242,177 227,193"/>
      <path d="M255,168 Q268,184 255,200"/>
      <path d="M175,195 Q190,210 175,226"/>
      <path d="M207,193 Q222,210 207,226"/>
      <path d="M238,196 Q252,212 238,228"/>
      <path d="M267,200 Q278,215 267,230"/>
      <!-- Top fin -->
      <path d="M150,120 Q185,70 230,118"/>
      <!-- Bottom fin -->
      <path d="M160,275 Q180,310 215,278"/>
      <!-- Bubbles -->
      <circle cx="45" cy="155" r="10"/>
      <circle cx="30" cy="125" r="7"/>
      <circle cx="52" cy="100" r="13"/>
    </svg>`
  },
  {
    name: "Robot",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,rect,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Head -->
      <rect x="130" y="60" width="140" height="110" rx="16"/>
      <!-- Antenna -->
      <line x1="200" y1="60" x2="200" y2="30"/>
      <circle cx="200" cy="25" r="10"/>
      <!-- Eyes -->
      <rect x="150" y="85" width="38" height="30" rx="6"/>
      <rect x="212" y="85" width="38" height="30" rx="6"/>
      <circle cx="169" cy="100" r="8" style="fill:#222;stroke:none"/>
      <circle cx="231" cy="100" r="8" style="fill:#222;stroke:none"/>
      <!-- Mouth panel -->
      <rect x="155" y="130" width="90" height="25" rx="6"/>
      <line x1="170" y1="130" x2="170" y2="155"/>
      <line x1="185" y1="130" x2="185" y2="155"/>
      <line x1="200" y1="130" x2="200" y2="155"/>
      <line x1="215" y1="130" x2="215" y2="155"/>
      <line x1="230" y1="130" x2="230" y2="155"/>
      <!-- Neck -->
      <rect x="185" y="170" width="30" height="18"/>
      <!-- Body -->
      <rect x="110" y="188" width="180" height="130" rx="12"/>
      <!-- Chest panel -->
      <rect x="140" y="208" width="50" height="45" rx="6"/>
      <circle cx="165" cy="225" r="12"/>
      <circle cx="165" cy="225" r="5" style="fill:#222;stroke:none"/>
      <rect x="205" y="208" width="55" height="20" rx="4"/>
      <rect x="205" y="233" width="55" height="20" rx="4"/>
      <!-- Arms -->
      <rect x="60" y="192" width="50" height="110" rx="14"/>
      <rect x="290" y="192" width="50" height="110" rx="14"/>
      <!-- Hands -->
      <rect x="55" y="302" width="60" height="36" rx="10"/>
      <rect x="285" y="302" width="60" height="36" rx="10"/>
      <!-- Legs -->
      <rect x="135" y="318" width="50" height="70" rx="10"/>
      <rect x="215" y="318" width="50" height="70" rx="10"/>
      <!-- Feet -->
      <rect x="125" y="375" width="68" height="22" rx="8"/>
      <rect x="207" y="375" width="68" height="22" rx="8"/>
    </svg>`
  },
  {
    name: "Butterfly",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <ellipse cx="200" cy="200" rx="12" ry="75"/>
      <!-- Antennae -->
      <path d="M196,128 Q175,95 165,75"/>
      <circle cx="163" cy="72" r="7"/>
      <path d="M204,128 Q225,95 235,75"/>
      <circle cx="237" cy="72" r="7"/>
      <!-- Top left wing -->
      <path d="M195,160 Q120,90 80,120 Q50,150 90,200 Q130,230 190,195"/>
      <!-- Top right wing -->
      <path d="M205,160 Q280,90 320,120 Q350,150 310,200 Q270,230 210,195"/>
      <!-- Bottom left wing -->
      <path d="M193,215 Q120,225 95,265 Q80,295 120,310 Q160,320 195,260"/>
      <!-- Bottom right wing -->
      <path d="M207,215 Q280,225 305,265 Q320,295 280,310 Q240,320 205,260"/>
      <!-- Wing decorations top left -->
      <circle cx="120" cy="155" r="18"/>
      <circle cx="110" cy="185" r="10"/>
      <!-- Wing decorations top right -->
      <circle cx="280" cy="155" r="18"/>
      <circle cx="290" cy="185" r="10"/>
      <!-- Wing decorations bottom -->
      <circle cx="128" cy="272" r="14"/>
      <circle cx="272" cy="272" r="14"/>
      <!-- Spots -->
      <circle cx="152" cy="145" r="7"/>
      <circle cx="248" cy="145" r="7"/>
    </svg>`
  },
  {
    name: "Dragon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <ellipse cx="195" cy="255" rx="95" ry="75"/>
      <!-- Neck -->
      <path d="M145,195 Q130,150 145,110"/>
      <path d="M175,188 Q175,145 165,110"/>
      <!-- Head -->
      <ellipse cx="155" cy="95" rx="55" ry="38" transform="rotate(-10,155,95)"/>
      <!-- Snout -->
      <path d="M108,100 Q100,115 115,120 Q130,125 140,112"/>
      <!-- Eye -->
      <ellipse cx="148" cy="80" rx="12" ry="10"/>
      <ellipse cx="150" cy="82" rx="5" ry="6" style="fill:#222;stroke:none"/>
      <!-- Horns -->
      <path d="M148,60 Q138,30 148,18"/>
      <path d="M170,56 Q168,25 178,15"/>
      <!-- Nostrils -->
      <circle cx="112" cy="113" r="4" style="fill:#222;stroke:none"/>
      <!-- Teeth -->
      <line x1="120" y1="118" x2="118" y2="128"/>
      <line x1="132" y1="122" x2="131" y2="132"/>
      <!-- Spikes down back -->
      <polygon points="175,188 165,165 183,175"/>
      <polygon points="218,182 212,158 226,172"/>
      <polygon points="255,196 254,170 265,188"/>
      <polygon points="278,218 280,192 288,212"/>
      <!-- Tail -->
      <path d="M285,295 Q345,300 360,270 Q375,240 350,225 Q340,218 335,230"/>
      <polygon points="335,230 318,218 330,210"/>
      <!-- Wings -->
      <path d="M155,210 Q80,170 55,120 Q75,140 110,180 Q90,130 100,90 Q125,160 175,205"/>
      <path d="M228,205 Q300,165 325,110 Q305,130 270,172 Q295,125 282,88 Q258,158 218,200"/>
      <!-- Legs -->
      <path d="M135,315 L118,365 L105,368 M118,365 L122,370"/>
      <path d="M240,320 L252,368 L240,372 M252,368 L262,370"/>
      <!-- Claws -->
      <line x1="105" y1="368" x2="98" y2="378"/>
      <line x1="112" y1="370" x2="108" y2="380"/>
    </svg>`
  },
  {
    name: "Truck",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,rect,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Cab -->
      <rect x="220" y="155" width="135" height="130" rx="8"/>
      <!-- Cab roof curve -->
      <path d="M220,155 Q230,120 275,115 Q320,112 355,150 L355,155"/>
      <!-- Windshield -->
      <path d="M228,155 Q238,128 272,122 Q308,118 348,152"/>
      <!-- Cab window -->
      <rect x="235" y="165" width="80" height="55" rx="6"/>
      <!-- Door handle -->
      <line x1="268" y1="215" x2="285" y2="215"/>
      <!-- Cargo box -->
      <rect x="45" y="155" width="175" height="130" rx="4"/>
      <!-- Cargo box detail lines -->
      <line x1="102" y1="155" x2="102" y2="285"/>
      <line x1="158" y1="155" x2="158" y2="285"/>
      <!-- Main wheels -->
      <circle cx="105" cy="308" r="42"/>
      <circle cx="105" cy="308" r="22"/>
      <circle cx="300" cy="308" r="42"/>
      <circle cx="300" cy="308" r="22"/>
      <!-- Rear double wheel -->
      <circle cx="195" cy="308" r="42"/>
      <circle cx="195" cy="308" r="22"/>
      <!-- Chassis -->
      <line x1="45" y1="285" x2="355" y2="285"/>
      <!-- Exhaust pipe -->
      <rect x="358" y="130" width="12" height="55" rx="4"/>
      <!-- Exhaust smoke -->
      <path d="M362,130 Q356,112 364,98 Q372,84 364,70"/>
      <!-- Headlight -->
      <rect x="353" y="215" width="20" height="30" rx="4"/>
      <!-- Bumper -->
      <rect x="348" y="265" width="30" height="12" rx="4"/>
      <!-- Side mirror -->
      <rect x="352" y="168" width="18" height="12" rx="3"/>
    </svg>`
  },
  {
    name: "Unicorn",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <style>path,circle,ellipse,polygon,line{fill:none;stroke:#222;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}</style>
      <!-- Body -->
      <ellipse cx="215" cy="265" rx="115" ry="80"/>
      <!-- Neck -->
      <path d="M135,215 Q120,175 140,140"/>
      <path d="M168,208 Q162,168 170,138"/>
      <!-- Head -->
      <ellipse cx="155" cy="118" rx="55" ry="42"/>
      <!-- Horn -->
      <polygon points="155,78 145,35 165,35"/>
      <!-- Ear -->
      <polygon points="190,90 205,65 210,92"/>
      <!-- Eye -->
      <ellipse cx="138" cy="108" rx="13" ry="12"/>
      <circle cx="141" cy="110" r="5" style="fill:#222;stroke:none"/>
      <!-- Nostril -->
      <ellipse cx="115" cy="128" rx="6" ry="4"/>
      <!-- Mouth -->
      <path d="M108,135 Q120,145 132,138"/>
      <!-- Mane -->
      <path d="M172,82 Q185,60 175,40 Q190,55 182,75 Q200,55 192,35 Q208,52 198,72 Q215,55 207,78"/>
      <path d="M168,135 Q155,155 165,175 Q145,160 152,140"/>
      <!-- Legs -->
      <path d="M135,330 L128,390"/>
      <path d="M163,335 L160,390"/>
      <path d="M248,335 L255,390"/>
      <path d="M278,328 L288,390"/>
      <!-- Hooves -->
      <ellipse cx="128" cy="392" rx="14" ry="7"/>
      <ellipse cx="160" cy="392" rx="14" ry="7"/>
      <ellipse cx="255" cy="392" rx="14" ry="7"/>
      <ellipse cx="288" cy="392" rx="14" ry="7"/>
      <!-- Tail -->
      <path d="M325,275 Q370,255 365,220 Q360,190 340,195"/>
      <path d="M325,285 Q375,280 372,245"/>
      <path d="M323,295 Q368,310 360,275"/>
      <!-- Stars -->
      <path d="M330,80 L333,90 L343,90 L335,96 L338,106 L330,100 L322,106 L325,96 L317,90 L327,90 Z"/>
      <path d="M355,140 L357,147 L364,147 L359,151 L361,158 L355,154 L349,158 L351,151 L346,147 L353,147 Z"/>
    </svg>`
  }
];
