var AuthenticationManager = artifacts.require("./AuthenticationManager.sol");
var GODTokenCrowdsale = artifacts.require("./GODTokenCrowdsale.sol");
var GODToken = artifacts.require("./GODToken.sol");
var DividendManager = artifacts.require("./DividendManager.sol");
var TransparencyRelayer = artifacts.require("./TransparencyRelayer.sol");

module.exports = function(deployer) {

	deployer.deploy(AuthenticationManager).then(function() {

		AuthenticationManagerAddress = AuthenticationManager.address;

	  	deployer.deploy(GODTokenCrowdsale, AuthenticationManagerAddress).then(function() {
	  		GODTokenCrowdsaleAddress = GODTokenCrowdsale.address;
			
			deployer.deploy(GODToken, GODTokenCrowdsaleAddress, AuthenticationManagerAddress).then(function() {
		  		
		  		GodTokenAddress = GODToken.address;
		  		
		  		deployer.deploy(DividendManager, GodTokenAddress).then(function() {
			  		deployer.deploy(TransparencyRelayer, AuthenticationManagerAddress).then(function() {
								  			  				  		
					});	
				});	

			});
		});
	});

};
