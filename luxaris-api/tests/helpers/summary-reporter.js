/**
 * Custom Jest Reporter
 * Displays a clean summary of failed tests at the end
 */
class SummaryReporter {
    constructor(globalConfig, options) {
        this._globalConfig = globalConfig;
        this._options = options;
        this.failed_tests = [];
    }

    onTestResult(test, testResult, aggregatedResult) {
        if (testResult.numFailingTests > 0) {
            testResult.testResults.forEach((result) => {
                if (result.status === 'failed') {
                    // Extract line number and assertion from error message
                    const errorMessage = result.failureMessages[0] || '';
                    const lineMatch = errorMessage.match(/at.*?\((.+?):(\d+):(\d+)\)/);
                    const assertMatch = errorMessage.match(/expect\((.+?)\)\.toBe\((.+?)\)/);
                    
                    // Build hierarchical test path from ancestor titles
                    const testPath = [...result.ancestorTitles, result.title].join(' -> ');
                    
                    this.failed_tests.push({
                        suite: testResult.testFilePath.replace(process.cwd(), '').replace(/\\/g, '/'),
                        test: testPath,
                        line: lineMatch ? lineMatch[2] : 'unknown',
                        assertion: assertMatch ? `expect(${assertMatch[1]}).toBe(${assertMatch[2]})` : null,
                        error: errorMessage
                    });
                }
            });
        }
    }

    onRunComplete(contexts, results) {
        // Always show summary section if there were any failures
        if (results.numFailedTests > 0) {
            console.log('\n\n═══════════════════════════════════════════════════════════════');
            console.log('📋 Failed Tests Summary');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            if (this.failed_tests.length > 0) {
                this.failed_tests.forEach((failure, index) => {
                    console.log(`${index + 1}. ${failure.suite} (line ${failure.line})`);
                    console.log(`   ✗ ${failure.test}`);
                    if (failure.assertion) {
                        console.log(`   ⚠  ${failure.assertion}`);
                    }
                    console.log('');
                });
            } else {
                console.log('No failed test details captured\n');
            }
            
            console.log('═══════════════════════════════════════════════════════════════\n');
        } else {
            console.log('\n✅ All tests passed!\n');
        }
    }
}

module.exports = SummaryReporter;
