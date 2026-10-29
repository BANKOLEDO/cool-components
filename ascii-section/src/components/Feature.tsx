type FeatureProps = {
  number?: string;
  title: string;
  children: string;
};

export default function Feature({ number, title, children }: FeatureProps) {
  return (
    <li className="feature">
      {number ? <span className="feature-number">{number}</span> : null}
      <span>
        <strong>{title}</strong>
        <span className="feature-copy">{children}</span>
      </span>
    </li>
  );
}
