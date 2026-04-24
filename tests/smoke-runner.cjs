const suites = [
  ...require("./smoke/auth-cookie-policy.test.cjs"),
  ...require("./smoke/payment-status-content.test.cjs"),
  ...require("./smoke/quiz-admission.test.cjs"),
];

async function main() {
  let passed = 0;

  for (const suite of suites) {
    try {
      await suite.run();
      passed += 1;
      console.log(`OK  ${suite.name}`);
    } catch (error) {
      console.error(`FAIL ${suite.name}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log(`Smoke tests completados: ${passed}/${suites.length}`);
}

void main();
