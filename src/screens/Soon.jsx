export default function Soon({ name }) {
  return (
    <>
      <header><div className="sub">Coming in a later build step</div><h1>{name}</h1></header>
      <div className="card"><div className="note">This screen is designed in the mockup and gets built next. Today, Tasks, Journal, Appearance and Settings already work and save your data.</div></div>
    </>
  );
}
