const { GoogleSpreadsheet } = require('google-spreadsheet');
const { buymaOrderDetail } = require('./buymaOrderDetail');

async function googleOrderSheet(transactionID) {
  // 시트 url중 값
  // Initialize the sheet - doc ID is the long id in the sheets URL
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREAD_ID || googleSpreadId);

  // GOOGLE_API_KEY로 구글API다루는 방법. 읽는것만 가능.
  // doc.useApiKey(process.env.GOOGLE_API_KEY);

  // GOOGLE_SERVICE로 구글API다루는 방법. 편집 가능.
  // Initialize Auth - see more available options at https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || googleServiceAccountEmail,
    private_key: process.env.GOOGLE_PRIVATE_KEY || googlePrivateKey,
  });

  // loads document properties and worksheets
  await doc.loadInfo();

  // the buymaList 시트ID로 시트취득
  const sheet = doc.sheetsById[process.env.GOOGLE_ORDER_SHEET_ID || googleOrderSheetId];

  // rows 취득
  const rows = await sheet.getRows();

  // 구글 시트(受注list)에 取引ID가 존재하는지 확인
  let orderDetailObject;
  let isTransactionID = false;
  for (i = 1; i < rows.length; i++) {
    // 구글 시트(受注list)에 取引ID가 존재하는 경우 패스
    if (rows[i].transactionID == transactionID) {
      isTransactionID = true;
      break;
    }
  }
  // buyma 주문 상세페이지에서 정보 취득
  // 구글 시트(利益計算)에서 값을 취득 함
  if (!isTransactionID) {
    orderDetailObject = await buymaOrderDetail(transactionID);
    // 구글 시트(受注list)에 값입력
    for (i = 1; i < rows.length; i++) {
      // row 추가
      if (!rows[i].transactionID) {
        rows[i].transactionID = orderDetailObject.transactionID;
        rows[i].productOrderDate = orderDetailObject.productOrderDate;
        rows[i].peculiarities = orderDetailObject.peculiarities;
        rows[i].rowNum = orderDetailObject.rowNum;
        rows[i].productURL = orderDetailObject.productURL;
        rows[i].productCount = orderDetailObject.productCount;
        rows[i].productColor = orderDetailObject.productColor;
        rows[i].productDeliveryMethod = orderDetailObject.productDeliveryMethod;
        rows[i].productCustomerJPName = orderDetailObject.productCustomerJPName;
        rows[i].productCustomerJPAddress = orderDetailObject.productCustomerJPAddress;
        rows[i].productCustomerENName = orderDetailObject.productCustomerENName;
        rows[i].productCustomerPostalCode = orderDetailObject.productCustomerPostalCode;
        rows[i].productCustomerENAddress = orderDetailObject.productCustomerENAddress;
        rows[i].productCustomerENAddress1 = orderDetailObject.productCustomerENAddress1;
        rows[i].productCustomerENAddress2 = orderDetailObject.productCustomerENAddress2;
        rows[i].productCustomerENAddress3 = orderDetailObject.productCustomerENAddress3;
        rows[i].productCustomerENAddress4 = orderDetailObject.productCustomerENAddress4;
        rows[i].productCustomerCellPhoneNumber = orderDetailObject.productCustomerCellPhoneNumber;
        rows[i].productProfit = orderDetailObject.productProfit;
        rows[i].productTypeEN = orderDetailObject.productTypeEN;
        rows[i].productPriceEN = orderDetailObject.productPriceEN;
        rows[i].productWeight = orderDetailObject.productWeight;
        rows[i].comment = orderDetailObject.comment;
        rows[i].productDeadlineDate = orderDetailObject.productDeadlineDate;

        rows[i].save();
        break;
      }
    }
  }
}

module.exports.googleOrderSheet = googleOrderSheet;
