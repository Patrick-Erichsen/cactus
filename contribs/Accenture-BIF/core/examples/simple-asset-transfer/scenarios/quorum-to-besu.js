const log4js = require(`log4js`);
const ConnectorQuorum = require(`../quorum/connector.js`);
const ConnectorBesu = require(`../besu/connector.js`);
const Client = require(`@hyperledger-labs/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`quorum-to-besu`);
logger.level = `info`;
const connectorQuorum = new ConnectorQuorum(conf.blockchains.quorum);
const connectorBesu = new ConnectorBesu(conf.blockchains.besu);
const quorumFederationClient = new Client({ validators: conf.federations.quorum });
const quorumAsset = conf.assets.quorum;

(async () => {
  try {
    // Step.1 Create asset on Quorum
    const createdAsset = await connectorQuorum.createAsset(quorumAsset);
    logger.info(`Asset has been created: ${JSON.stringify(createdAsset)}`);

    // Step.2: Lock asset on Quorum
    const targetDLTId = `BESU_DLT1`;
    const receiverPubKey = `031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b`;
    const lockedAsset = await connectorQuorum.lockAsset(quorumAsset.assetId, targetDLTId, receiverPubKey);
    logger.info(`Asset has been locked: ${JSON.stringify(lockedAsset)}`);

    const targetDLTType = 'BESU';

    // Step 2.5 (optional): Query the asset on Quorum
    const assetInfo = await connectorQuorum.getAsset(quorumAsset.assetId, targetDLTType);
    logger.info(`${targetDLTType} formatted asset has been queried: ${JSON.stringify(assetInfo)}`);

    // Step.3 Ask For Signatures to the Quorum federation
    const multiSignature = await quorumFederationClient.askForSignatures(quorumAsset.assetId, targetDLTType);
    logger.info(`Signatures are:`, JSON.stringify(multiSignature.signatures));

    // Step.4: Verify Signatures on Besu
    const verifications = await connectorBesu.verifyMultisig(multiSignature);
    logger.info(`Signatures have been verified: ${JSON.stringify(verifications)}`);

    // Step.5 Creating a copy of the exported asset on Besu
    const result = await connectorBesu.copyAsset(multiSignature);
    logger.info(`Asset has been copied: ${JSON.stringify(result)}`);

    return;
  } catch (error) {
    logger.info(error);
    process.exit(1);
  }
})();
