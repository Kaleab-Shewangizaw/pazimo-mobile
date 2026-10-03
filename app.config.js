// The associated-domains entitlement forces Expo to code sign even simulator
// builds, which fails on machines without an Apple Developer certificate.
// Universal links only work in signed builds anyway, so we only add it on EAS
// or when explicitly requested (IOS_ASSOCIATED_DOMAINS=1 npx expo run:ios).
const withAssociatedDomains =
  process.env.EAS_BUILD === 'true' || process.env.IOS_ASSOCIATED_DOMAINS === '1';

module.exports = ({ config }) => {
  if (!withAssociatedDomains) {
    const { associatedDomains, ...ios } = config.ios ?? {};
    return { ...config, ios };
  }
  return config;
};
