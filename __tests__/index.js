const {fixDuplicates, listDuplicates} = require('../index.js');
const lockfile = require('@yarnpkg/lockfile')
const outdent = require('outdent')

test('dedupes lockfile to max compatible version', () => {
  const yarn_lock = outdent`
    library@^1.1.0:
      version "1.2.0"
      resolved "https://example.net/library@^1.1.0"

    library@^1.2.0:
      version "1.2.0"
      resolved "https://example.net/library@^1.2.0"

    library@^1.3.0:
      version "1.3.0"
      resolved "https://example.net/library@^1.3.0"
    `;
  const deduped = fixDuplicates(yarn_lock);
  const json = lockfile.parse(deduped).object;

  expect(json['library@^1.1.0']['version']).toEqual('1.3.0');
  expect(json['library@^1.2.0']['version']).toEqual('1.3.0');
  expect(json['library@^1.3.0']['version']).toEqual('1.3.0');

  const list = listDuplicates(yarn_lock);

  expect(list).toContain('Package "library" wants ^1.2.0 and could get 1.3.0, but got 1.2.0');
  expect(list).toContain('Package "library" wants ^1.1.0 and could get 1.3.0, but got 1.2.0');
});

test('dedupes lockfile to most common compatible version', () => {
  const yarn_lock = outdent`
    library@>=1.0.0:
      version "3.0.0"
      resolved "https://example.net/library@^3.0.0"

    library@>=1.1.0:
      version "3.0.0"
      resolved "https://example.net/library@^3.0.0"

    library@^2.0.0:
      version "2.1.0"
      resolved "https://example.net/library@^2.1.0"
  `;
  const deduped = fixDuplicates(yarn_lock, {
    useMostCommon: true,
  });
  const json = lockfile.parse(deduped).object;

  expect(json['library@>=1.0.0']['version']).toEqual('2.1.0');
  expect(json['library@>=1.1.0']['version']).toEqual('2.1.0');
  expect(json['library@^2.0.0']['version']).toEqual('2.1.0');

  const list = listDuplicates(yarn_lock, {
    useMostCommon: true,
  });

  expect(list).toContain('Package "library" wants >=1.0.0 and could get 2.1.0, but got 3.0.0');
  expect(list).toContain('Package "library" wants >=1.1.0 and could get 2.1.0, but got 3.0.0');
});

test('limits the packages to be de-duplicated', () => {
  const yarn_lock = outdent`
    a-package@^2.0.0:
      version "2.0.0"
      resolved "http://example.com/a-package/2.1.0"

    a-package@^2.0.1:
      version "2.0.1"
      resolved "http://example.com/a-package/2.2.0"

    other-package@^1.0.0:
      version "1.0.11"
      resolved "http://example.com/other-package/1.0.0"

    other-package@^1.0.1:
      version "1.0.12"
      resolved "http://example.com/other-package/1.0.0"
  `;

  const deduped = fixDuplicates(yarn_lock, {
    includePackages: ["other-package"]
  });
  const json = lockfile.parse(deduped).object;

  expect(json['a-package@^2.0.0']['version']).toEqual('2.0.0');
  expect(json['a-package@^2.0.1']['version']).toEqual('2.0.1');
  expect(json['other-package@^1.0.0']['version']).toEqual('1.0.12');
  expect(json['other-package@^1.0.1']['version']).toEqual('1.0.12');

  const list = listDuplicates(yarn_lock, {
    includePackages: ["other-package"]
  });

  expect(list).toHaveLength(1);
  expect(list).toContain('Package "other-package" wants ^1.0.0 and could get 1.0.12, but got 1.0.11');
});
