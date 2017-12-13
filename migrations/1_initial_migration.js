var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  console.log('deploy 1_initial_migration.js');
  deployer.deploy(Migrations);
};
