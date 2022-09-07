const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace unit Tests", function () {
          let nftMarketplace, deployer, basicNft
          const chainId = network.config.chainId
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0
          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract(
                  "NFTMarketplace",
                  deployer
              )

              basicNft = await ethers.getContract("BasicNft", deployer)
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })
          it("lists and can be bought", async function () {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              const playerConnectedNftMarketplace =
                  await nftMarketplace.connect(player)
              await playerConnectedNftMarketplace.buyItem(
                  basicNft.address,
                  TOKEN_ID,
                  { value: PRICE }
              )
              const newOwner = await basicNft.ownerOf(TOKEN_ID)
              const deployerProceeds = await nftMarketplace.getProceeds(
                  deployer.address
              )
              assert(newOwner.toString() == player.address)
              assert(deployerProceeds.toString(), PRICE.toString())
          })
          describe("list Item", async () => {
              it("emits an event when an item listed", async () => {
                  expect(
                      await nftMarketplace.listItem(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).emit("ItemListed")
              })
              it("doesn't allow list an already listed item", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const error = `NFTMarketplace__AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(error)
              })
              it("only allows owner to list an item", async () => {
                  const playerConnectedNftMarketplace =
                      await nftMarketplace.connect(player)

                  await expect(
                      playerConnectedNftMarketplace.listItem(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWith("NFTMarketplace__NotOwner()")
              })
              it("needs approvals to list item", async function () {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotApprovedForMarketplace")
              })
              it("Updates listing with seller and price", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.seller.toString() == deployer.address)
              })
          })
          describe("cancelListing", () => {
              it("emits event when canceled an item, and remove the item", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  expect(
                      await nftMarketplace.cancelListing(
                          basicNft.address,
                          TOKEN_ID
                      )
                  ).emit("ItemCanceled")
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert(listing.price.toString() == "0")
              })
              it("checks whether is listed or not", async () => {
                  const error = `NFTMarketplace__NotListed("${basicNft.address}", ${TOKEN_ID})`

                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith(error)
              })
              it("allows only owner to cancel an item ", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const playerConnectedNftMarketplace =
                      nftMarketplace.connect(player)

                  const error = `NFTMarketplace__NotOwner("${basicNft.address}", ${TOKEN_ID})`

                  await expect(
                      playerConnectedNftMarketplace.cancelListing(
                          basicNft.address,
                          TOKEN_ID
                      )
                  ).to.be.revertedWith("NFTMarketplace__NotOwner()")
              })
          })
          describe("updateListing", () => {
              it("emits an event when an item list updated", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  expect(
                      await nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).emit("ItemListed")
              })
              it("must be owner and listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWith("NotListed")
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplaceConnectedtoPlayer =
                      nftMarketplace.connect(player)
                  await expect(
                      nftMarketplaceConnectedtoPlayer.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWith("NotOwner")
              })
          })
          describe("buyItem", () => {
              it("must be listed", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NotListed")
              })
              it("should  pay enough eth", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )

                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("PriceNotMet")
              })
              it("emits an event removes the listing,change the owner and adds proceeds", async () => {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const nftMarketplaceConnectedtoPlayer =
                      nftMarketplace.connect(player)
                  expect(
                      await nftMarketplaceConnectedtoPlayer.buyItem(
                          basicNft.address,
                          TOKEN_ID,
                          { value: PRICE }
                      )
                  ).emit("ItemBought")
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert(listing.price.toString() == "0")
                  assert.equal(
                      (await basicNft.ownerOf(TOKEN_ID)).toString(),
                      player.address
                  )
                  const newProceed = await nftMarketplace.getProceeds(
                      deployer.address
                  )
                  assert(newProceed.toString() == PRICE.toString())
              })
          })
          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdrawls", async function () {
                  await expect(
                      nftMarketplace.withdrawProceeds()
                  ).to.be.revertedWith("NoProceeds")
              })
              it("withdraws proceeds", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  nftMarketplaceConnectedtoPlayer =
                      nftMarketplace.connect(player)
                  await nftMarketplaceConnectedtoPlayer.buyItem(
                      basicNft.address,
                      TOKEN_ID,
                      {
                          value: PRICE,
                      }
                  )

                  const deployerProceedsBefore =
                      await nftMarketplace.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore
                              .add(deployerBalanceBefore)
                              .toString()
                  )
              })
          })
      })
