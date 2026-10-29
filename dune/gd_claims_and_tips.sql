-- Pico: G$ claims and tips to creators
-- Tracks GoodDollar token transfers to creator wallets

WITH creator_wallets AS (
    SELECT address FROM (
        VALUES
            (0x0000000000000000000000000000000000000000) -- placeholder: replace with real creator wallets
    ) AS t(address)
),
gd_transfers AS (
    SELECT
        evt_block_time,
        "from" AS sender,
        "to" AS recipient,
        CAST(value AS DOUBLE) / 100.0 AS gd_amount,
        evt_tx_hash
    FROM celo.erc20_celo.evt_Transfer
    WHERE contract_address = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A
        AND evt_block_time >= NOW() - INTERVAL '90' DAY
)

SELECT
    date_trunc('day', g.evt_block_time) AS day,
    COUNT(*) AS tips,
    COUNT(DISTINCT g.sender) AS unique_tippers,
    SUM(g.gd_amount) AS total_gd_tipped
FROM gd_transfers g
INNER JOIN creator_wallets cw ON g.recipient = cw.address
GROUP BY 1
ORDER BY 1 DESC
