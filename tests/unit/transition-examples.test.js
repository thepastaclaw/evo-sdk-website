import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const docs = fs.readFileSync(new URL('../../public/docs.html', import.meta.url), 'utf8');
const aiReference = fs.readFileSync(new URL('../../public/AI_REFERENCE.md', import.meta.url), 'utf8');
const apiDefinitions = JSON.parse(
  fs.readFileSync(new URL('../../public/api-definitions.json', import.meta.url), 'utf8')
);

function transitionSdkParams(key) {
  for (const group of Object.values(apiDefinitions.transitions || {})) {
    const transition = group.transitions?.[key];
    if (transition) {
      return transition.sdk_params || [];
    }
  }
  return [];
}

describe('generated state transition examples', () => {
  it('uses the Evo SDK v4 payload and signer call shape', () => {
    expect(aiReference).toContain('sdk.documents.create({ document, identityKey, signer })');
    expect(aiReference).toContain('sdk.contracts.publish({ dataContract, identityKey, signer })');
    expect(aiReference).toContain('sdk.identities.topUp({ identity, assetLockProof, assetLockPrivateKey })');
    expect(aiReference).toContain('sdk.tokens.burn({ dataContractId, tokenPosition');
  });

  it('does not pass WIF strings directly to transition methods', () => {
    const legacyTransitionCall = /await sdk\.(?:identities|contracts|documents|tokens|dpns|voting|addresses)\.[^(]+\(\{[^}\n]*privateKeyWif/;

    expect(aiReference).not.toMatch(legacyTransitionCall);
    expect(docs).not.toMatch(legacyTransitionCall);
    expect(aiReference).not.toContain('{ ...params, privateKeyWif }');
  });

  it('renders multiline transition examples as valid snippets', () => {
    expect(docs).not.toMatch(/\breturn\s+(?:const|let|var|\/\/)/);
  });

  it('documents Identity objects for address identity transitions', () => {
    for (const key of ['addressTopUpIdentity', 'addressTransferFromIdentity']) {
      const identityParam = transitionSdkParams(key).find((param) => param.name === 'identity');
      expect(identityParam, `${key} should declare an identity sdk param`).toMatchObject({
        type: 'object',
        required: true,
      });
      expect(transitionSdkParams(key).some((param) => param.name === 'identityId')).toBe(false);
    }

    expect(aiReference).toContain('sdk.addresses.topUpIdentity({ identity, inputs, signer })');
    expect(aiReference).toContain('sdk.addresses.transferFromIdentity({ identity, outputs, signer })');
    expect(aiReference).not.toMatch(/\*\*Top Up Identity from Address\*\*[\s\S]*?- `Identity ID` \(string/);
    expect(aiReference).not.toMatch(/\*\*Transfer from Identity to Address\*\*[\s\S]*?- `Identity ID` \(string/);
  });
});
