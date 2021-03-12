const jwt = require("jsonwebtoken");

const createToken = (id) => {
  const token = jwt.sign(
    {
      data: id,
    },
    "some-jwt-secret",
    { expiresIn: "72h" }
  );

  return token;
};

const checkToken = async (id, token) => {
  const decodedToken = jwt.verify(token, "some-jwt-secret");
  return decodedToken.data == id;
};

exports.checkToken = checkToken;
exports.createToken = createToken;
