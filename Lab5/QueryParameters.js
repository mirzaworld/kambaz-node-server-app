export default function QueryParameters(app) {
  const calculator = (req, res) => {
    const { a, b, operation } = req.query;
    let result = 0;
    switch (operation) {
      case "add":
        result = parseInt(a) + parseInt(b);
        break;
      case "subtract":
        result = parseInt(a) - parseInt(b);
        break;
      case "multiply":
        result = parseInt(a) * parseInt(b);
        break;
      case "divide":
        if (parseInt(b) === 0) {
          res.status(400).send("Cannot divide by zero");
          return;
        }
        result = parseInt(a) / parseInt(b);
        break;
      default:
        res.status(400).send("Invalid operation");
        return;
    }
    res.send(result.toString());
  };
  app.get("/lab5/calculator", calculator);
}
