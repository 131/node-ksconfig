"use strict";

const expect = require('expect.js');
const path = require('path');
const fs   = require('fs');
const ksconfig = require('..');

describe("Initial test suite", function() {

  it("Should match reference file", async function() {

    let body = await ksconfig({wd : __dirname}, 'fixtures/entrypoint.xml');
    let challenge = fs.readFileSync(path.join(__dirname, 'fixtures/result.xml'), 'utf-8');

    expect(body).to.eql(challenge);

  });






});
