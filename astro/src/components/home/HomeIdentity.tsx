type HomeIdentityProps = {
  title: string;
  description: string;
};

export function HomeIdentity({ title, description }: HomeIdentityProps) {
  return (
    <>
      <h1
        id="title"
        className="m-0 mt-[var(--title-margin-top)] ml-[var(--title-margin-left)] [font-family:var(--title-font)] [font-size:var(--title-size)] [font-weight:400] [font-synthesis:none] tracking-[-0.075em] leading-[0.98] [text-wrap:balance]"
      >
        {title}
      </h1>
      <p
        id="description"
        className="m-0 mt-[var(--description-margin-top)] ml-[var(--description-margin-left)] text-[#625d67] [font-family:var(--description-font)] [font-size:var(--description-size)] [line-height:1.4] [text-wrap:pretty]"
      >
        {description}
      </p>
    </>
  );
}
