// Marquee.jsx — infinite editorial strip (pure CSS animation)
export function Marquee({ items }) {
  const Row = () => (
    <>
      {items.map((t, i) => (
        <span className="molar-marquee__item" key={i}>
          {t}
          <svg viewBox="0 0 200 200" className="molar-marquee__tooth" aria-hidden="true">
            <path d="M100,16 C56,16 37,45 40,78 C42,98 51,106 53,126 C55,152 58,182 71,186 C82,189 85,157 90,139 C93,127 107,127 110,139 C115,157 118,189 129,186 C142,182 145,152 147,126 C149,106 158,98 160,78 C163,45 144,16 100,16 Z"
              fill="currentColor" />
          </svg>
        </span>
      ))}
    </>
  )
  return (
    <div className="molar-marquee" aria-hidden="true">
      <div className="molar-marquee__track"><Row /><Row /></div>
    </div>
  )
}
