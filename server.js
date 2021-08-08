const { buymaOrderList } = require('./targetURLs/buymaOrderList');
const { googleOrderSheet } = require('./targetURLs/googleOrderSheet');
require('dotenv').config();

// 비동기용 asyncForEach 함수 생성
Array.prototype.asyncForEach = async function (callback) {
	for (let index = 0; index < this.length; index++) {
		await callback(this[index], index, this);
	}
};
// buyma의取引ID를 취득
buymaOrderList().then(transactionIDArray => 
  {
    // 受注가 없다면 프로그램 종료
    if (transactionIDArray.length === 0) process.exit();

    // 구글 스프레드 시트(受注list)에서  取引ID가 있는지 확인
    transactionIDArray.asyncForEach(async (transactionIDObject) => {

      await googleOrderSheet(transactionIDObject.transactionID);
    })
  }).catch(e => console.log(e));


