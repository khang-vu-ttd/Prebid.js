import { expect } from 'chai'
import { spec } from 'modules/voxBidAdapter.js'
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js'
import { addFPDToBidderRequest } from '../../helpers/fpd.js'

function getSlotConfigs(mediaTypes, params) {
  return {
    params: params,
    sizes: [],
    bidId: '2df8c0733f284e',
    bidder: 'vox',
    mediaTypes: mediaTypes,
    transactionId: '31a58515-3634-4e90-9c96-f86196db1459'
  }
}

describe('VOX Adapter', function() {
  const PLACE_ID = '5af45ad34d506ee7acad0c26';
  const bidderRequest = {
    refererInfo: { page: 'referer' }
  }
  const bannerMandatoryParams = {
    placementId: PLACE_ID,
    placement: 'banner'
  }
  const videoMandatoryParams = {
    placementId: PLACE_ID,
    placement: 'video'
  }
  const inImageMandatoryParams = {
    placementId: PLACE_ID,
    placement: 'inImage',
    imageUrl: 'https://hybrid.ai/images/image.jpg'
  }
  const validBidRequests = [
    getSlotConfigs({ banner: {} }, bannerMandatoryParams),
    getSlotConfigs({ video: {playerSize: [[640, 480]], context: 'outstream'} }, videoMandatoryParams),
    getSlotConfigs({ banner: {sizes: [0, 0]} }, inImageMandatoryParams)
  ]
  describe('isBidRequestValid method', function() {
    describe('returns true', function() {
      describe('when banner slot config has all mandatory params', () => {
        describe('and banner placement has the correct value', function() {
          const slotConfig = getSlotConfigs(
            {banner: {}},
            {
              placementId: PLACE_ID,
              placement: 'banner'
            }
          )
          const isBidRequestValid = spec.isBidRequestValid(slotConfig)
          expect(isBidRequestValid).to.equal(true)
        })
        describe('and In-Image placement has the correct value', function() {
          const slotConfig = getSlotConfigs(
            {
              banner: {
                sizes: [[0, 0]]
              }
            },
            {
              placementId: PLACE_ID,
              placement: 'inImage',
              imageUrl: 'imageUrl'
            }
          )
          const isBidRequestValid = spec.isBidRequestValid(slotConfig)
          expect(isBidRequestValid).to.equal(true)
        })
        describe('when video slot has all mandatory params.', function() {
          it('should return true, when video mediatype object are correct.', function() {
            const slotConfig = getSlotConfigs(
              {
                video: {
                  context: 'instream',
                  playerSize: [[640, 480]]
                }
              },
              {
                placementId: PLACE_ID,
                placement: 'video'
              }
            )
            const isBidRequestValid = spec.isBidRequestValid(slotConfig)
            expect(isBidRequestValid).to.equal(true)
          })
        })
      })
    })
    describe('returns false', function() {
      describe('when params are not correct', function() {
        function createSlotconfig(params) {
          return getSlotConfigs({ banner: {} }, params)
        }
        it('does not have the placementId.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placement: 'banner'
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have the placement.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placementId: PLACE_ID
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have the imageUrl.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placementId: PLACE_ID,
              placement: 'inImage'
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have a the correct placement.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placementId: PLACE_ID,
              placement: 'something'
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
      })
      describe('when video mediaType object is not correct.', function() {
        function createVideoSlotconfig(mediaType) {
          return getSlotConfigs(mediaType, {
            placementId: PLACE_ID,
            placement: 'video'
          })
        }
        it('is a void object', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createVideoSlotconfig({ video: {} })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have playerSize.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createVideoSlotconfig({ video: { context: 'instream' } })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have context', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createVideoSlotconfig({
              video: {
                playerSize: [[640, 480]]
              }
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
      })
    })
  })
  it('Url params should be correct ', function() {
    const request = spec.buildRequests(validBidRequests, bidderRequest)
    expect(request.method).to.equal('POST')
    expect(request.url).to.equal('https://ssp.hybrid.ai/auction/prebid')
  })

  describe('buildRequests method', function() {
    it('Common data request should be correct', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest)
      const data = JSON.parse(request.data)
      expect(Array.isArray(data.bidRequests)).to.equal(true)
      expect(data.url).to.equal('referer')
      data.bidRequests.forEach(bid => {
        expect(bid.bidId).to.equal('2df8c0733f284e')
        expect(bid.placeId).to.equal(PLACE_ID)
        expect(bid.transactionId).to.equal('31a58515-3634-4e90-9c96-f86196db1459')
      })
    })
    it('should not set userid if not specified', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest)
      const data = JSON.parse(request.data)
      data.bidRequests.forEach(bid => {
        expect(bid.userId).to.be.undefined
      })
    })

    it('should set userid if specified', function () {
      const requests = validBidRequests.map(bid => ({
        ...bid,
        userId: {
          tdid: 'TDID_USER_ID',
          pubcid: 'PUBID_USER_ID'
        }
      }))
      const request = spec.buildRequests(requests, bidderRequest)
      const data = JSON.parse(request.data)
      data.bidRequests.forEach(bid => {
        expect(bid.userId.tdid).to.equal('TDID_USER_ID')
        expect(bid.userId.pubcid).to.equal('PUBID_USER_ID')
      })
    })

    it('should not set schain if not specified', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest)
      const data = JSON.parse(request.data)
      data.bidRequests.forEach(bid => {
        expect(bid.schain).to.be.undefined
      })
    })

    it('should set schain if not specified', function () {
      const requests = validBidRequests.map(bid => ({
        ...bid,
        ortb2: {
          source: {
            ext: {
              schain: {
                validation: 'strict',
                config: {
                  ver: '1.0'
                }
              }
            }
          }
        }
      }))
      const request = spec.buildRequests(requests, bidderRequest)
      const data = JSON.parse(request.data)
      data.bidRequests.forEach(bid => {
        expect(bid.schain.validation).to.equal('strict')
        expect(bid.schain.config.ver).to.equal('1.0')
      })
    })

    describe('price floors', function () {
      it('should be empty if floors module not configured', function () {
        const request = spec.buildRequests(validBidRequests, bidderRequest)
        const data = JSON.parse(request.data)
        data.bidRequests.forEach(bid => {
          expect(bid.floorInfo).to.be.empty
        })
      })

      it('should add correct floor values', function () {
        const expectedFloors = [ 2, 2.7, 1.4 ]
        const validBidRequests = expectedFloors.map(getBidWithFloor)
        const request = spec.buildRequests(validBidRequests, bidderRequest)
        const data = JSON.parse(request.data)
        expectedFloors.forEach((floor, index) => {
          expect(data.bidRequests[index].floorInfo.floor).to.equal(floor)
          expect(data.bidRequests[index].floorInfo.currency).to.equal('USD')
        })
      })

      it('should request floor price in adserver currency', function () {
        const configCurrency = 'DKK';
        setCurrencyConfig({ adServerCurrency: configCurrency });
        return addFPDToBidderRequest(bidderRequest).then(res => {
          const request = spec.buildRequests([ getBidWithFloor() ], res)
          const data = JSON.parse(request.data)
          data.bidRequests.forEach(bid => {
            expect(bid.floorInfo.currency).to.equal(configCurrency)
          })
          setCurrencyConfig({});
        });
      });

      function getBidWithFloor(floor) {
        return {
          ...validBidRequests[0],
          getFloor: ({ currency }) => {
            return {
              currency: currency,
              floor
            }
          }
        }
      }
    })

    describe('GDPR params', function() {
      describe('when there are not consent management platform', function() {
        it('cmp should be false', function() {
          const request = spec.buildRequests(validBidRequests, bidderRequest)
          const data = JSON.parse(request.data)
          expect(data.cmp).to.equal(false)
        })
      })
      describe('when there are consent management platform', function() {
        it('cmps should be true and ga should not sended, when gdprApplies is undefined', function() {
          bidderRequest['gdprConsent'] = {
            gdprApplies: undefined,
            consentString: 'consentString'
          }
          const request = spec.buildRequests(validBidRequests, bidderRequest)
          const data = JSON.parse(request.data)
          expect(data.cmp).to.equal(true)
          expect(Object.keys(data).indexOf('data')).to.equal(-1)
          expect(data.cs).to.equal('consentString')
        })
        it('cmps should be true and all gdpr parameters should be sended, when there are gdprApplies', function() {
          bidderRequest['gdprConsent'] = {
            gdprApplies: true,
            consentString: 'consentString'
          }
          const request = spec.buildRequests(validBidRequests, bidderRequest)
          const data = JSON.parse(request.data)
          expect(data.cmp).to.equal(true)
          expect(data.ga).to.equal(true)
          expect(data.cs).to.equal('consentString')
        })
      })
    })
  })

  describe('interpret response method', function() {
    it('should return a void array, when the server response are not correct.', function() {
      const request = { data: JSON.stringify({}) }
      const serverResponse = {
        body: {}
      }
      const bids = spec.interpretResponse(serverResponse, request)
      expect(typeof bids).to.equal('object')
      expect(bids.length).to.equal(0)
    })
    it('should return a void array, when the server response have not got bids.', function() {
      const request = { data: JSON.stringify({}) }
      const serverResponse = { body: { bids: [] } }
      const bids = spec.interpretResponse(serverResponse, request)
      expect(typeof bids).to.equal('object')
      expect(bids.length).to.equal(0)
    })
    describe('when the server response return a bid', function() {
      describe('the bid is a banner', function() {
        it('should return a banner bid', function() {
          const request = spec.buildRequests([validBidRequests[0]], bidderRequest)
          const serverResponse = {
            body: {
              bids: [
                {
                  bidId: '2df8c0733f284e',
                  price: 0.5,
                  currency: 'USD',
                  content: {
                    content: 'html',
                    width: 100,
                    height: 100
                  },
                  advertiserDomains: ['voxexchange.io']
                }
              ]
            }
          }
          const bids = spec.interpretResponse(serverResponse, request)
          expect(bids.length).to.equal(1)
          expect(bids[0].requestId).to.equal('2df8c0733f284e')
          expect(bids[0].mediaType).to.equal(spec.supportedMediaTypes[0])
          expect(bids[0].cpm).to.equal(0.5)
          expect(bids[0].width).to.equal(100)
          expect(bids[0].height).to.equal(100)
          expect(bids[0].currency).to.equal('USD')
          expect(bids[0].netRevenue).to.equal(true)
          expect(bids[0].meta.advertiserDomains).to.deep.equal(['voxexchange.io'])
          expect(typeof bids[0].ad).to.equal('string')
        })
        it('should return a In-Image bid', function() {
          const request = spec.buildRequests([validBidRequests[2]], bidderRequest)
          const serverResponse = {
            body: {
              bids: [
                {
                  bidId: '2df8c0733f284e',
                  price: 0.5,
                  currency: 'USD',
                  content: {
                    content: 'html',
                    width: 100,
                    height: 100
                  },
                  ttl: 360
                }
              ]
            }
          }
          const bids = spec.interpretResponse(serverResponse, request)
          expect(bids.length).to.equal(1)
          expect(bids[0].requestId).to.equal('2df8c0733f284e')
          expect(bids[0].cpm).to.equal(0.5)
          expect(bids[0].width).to.equal(100)
          expect(bids[0].height).to.equal(100)
          expect(bids[0].currency).to.equal('USD')
          expect(bids[0].netRevenue).to.equal(true)
          expect(typeof bids[0].ad).to.equal('string')
        })
      })
      describe('the bid is a video', function() {
        it('should return a video bid', function() {
          const request = spec.buildRequests([validBidRequests[1]], bidderRequest)
          const serverResponse = {
            body: {
              bids: [
                {
                  bidId: '2df8c0733f284e',
                  price: 0.5,
                  currency: 'USD',
                  content: 'html',
                  transactionId: '31a58515-3634-4e90-9c96-f86196db1459'
                }
              ]
            }
          }
          const bids = spec.interpretResponse(serverResponse, request)
          expect(bids.length).to.equal(1)
          expect(bids[0].requestId).to.equal('2df8c0733f284e')
          expect(bids[0].mediaType).to.equal(spec.supportedMediaTypes[1])
          expect(bids[0].cpm).to.equal(0.5)
          expect(bids[0].currency).to.equal('USD')
          expect(bids[0].netRevenue).to.equal(true)
          expect(typeof bids[0].vastXml).to.equal('string')
        })
      })
    })
  })
})
