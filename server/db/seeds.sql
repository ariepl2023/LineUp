-- Insert plans
INSERT INTO plans (name, price, max_beaches, has_alerts, description) VALUES
('Free', 0, 9, TRUE, 'View forecasts and get Telegram alerts for all beaches'),
('Pro', 19.99, 9, TRUE, 'Get Telegram alerts for all beaches');

-- Insert beaches
INSERT INTO beaches (name, latitude, longitude, region) VALUES
('חיפה', 32.818400, 34.988500, 'north'),
('בית ינאי', 32.543300, 34.904200, 'north'),
('שדות ים', 32.483300, 34.883300, 'north'),
('נתניה', 32.321500, 34.853200, 'center'),
('הרצליה', 32.166700, 34.800000, 'center'),
('תל אביב', 32.085300, 34.781800, 'center'),
('בת ים', 32.016700, 34.750000, 'center'),
('אשדוד', 31.794000, 34.650000, 'south'),
('אילת', 29.558100, 34.948200, 'south');