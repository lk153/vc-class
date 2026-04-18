/**
 * Shared required-field marker (red asterisk) + form-level legend.
 * Color uses the DESIGN.md error token (#7b0020). aria-hidden on the asterisk
 * so screen readers don't announce a literal "asterisk" — the underlying input's
 * `required` attribute already conveys requirement to assistive tech.
 */

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-[#7b0020] ml-0.5">
      *
    </span>
  );
}

export function RequiredFieldsHint({ text }: { text: string }) {
  return (
    <p className="text-xs font-body text-[#777586] mb-6">
      <span aria-hidden="true" className="text-[#7b0020] font-bold">*</span> {text}
    </p>
  );
}
