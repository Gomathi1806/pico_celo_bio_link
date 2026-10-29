-- Pico: Daily payment volume on Celo by token
-- Tracks ERC-20 transfers TO known creator wallets
-- Replace the creator_wallets CTE with your actual creator addresses

WITH creator_wallets AS (
    SELECT address FROM (
        VALUES
            (0x0000000000000000000000000000000000000000) -- placeholder: replace with real creator wallets
    ) AS t(address)
),
pico_tokens AS (
    SELECT address, symbol FROM (
        VALUES
            (0xcebA9300f2b948710d2653dD7B07f33A8B32118C, 'USDC'),
            (0x765DE816845861e75A25fCA122bb6898B8B1282a, 'cUSD'),
            (0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73, 'cEUR'),
            (0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787, 'cREAL'),
            (0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A, 'GD')
    ) AS t(address, symbol)
)

SELECT
    date_trunc('day', evt_block_time) AS day,
    pt.symbol AS token,
    COUNT(*) AS tx_count,
    SUM(
        CAST(value AS DOUBLE) / POWER(10,
            CASE pt.symbol
                WHEN 'USDC' THEN 6
                WHEN 'GD' THEN 2
                ELSE 18
            END
        )
    ) AS volume
FROM celo.erc20_celo.evt_Transfer t
INNER JOIN creator_wallets cw ON t."to" = cw.address
INNER JOIN pico_tokens pt ON t.contract_address = pt.address
WHERE evt_block_time >= NOW() - INTERVAL '90' DAY
GROUP BY 1, 2
ORDER BY 1 DESC, 2
