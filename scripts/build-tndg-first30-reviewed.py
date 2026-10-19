"""Build the manually reviewed lessons 1–30 from the existing source examples.

Run after changing the source example corpus or the editorial selections. The
output is committed so the website does not need Python at runtime.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/tiengnhatdongian-n3-detail-normalized.json'
OUTPUT = ROOT / 'data/tiengnhatdongian-n3-first30-reviewed.json'


def usage(heading, meaning, indexes, formation='', nuance='', added=None):
    return dict(heading=heading, meaning=meaning, indexes=indexes,
                formation=formation, nuance=nuance, added=added or [])


# Meaning and formation are edited against the cited article. Example indexes
# refer to SOURCE; they are deliberately selective because the scrape contains
# repetitions, broken ruby and malformed Japanese sentences.
LESSONS = {
    1: dict(structure='～うちに', meaning='Tranh thủ khi một trạng thái còn tiếp diễn; hoặc một thay đổi nảy sinh trong lúc đó.',
        formation='Vる／Vている／Vない + うちに\nAい／Aな + うちに\nN + の + うちに',
        nuance='Vế sau là hành động có chủ ý khi muốn tranh thủ; là thay đổi tự nhiên khi diễn tả diễn biến. Không nối trực tiếp với Vた.',
        usages=[usage('1. Tranh thủ trước khi trạng thái thay đổi', 'Khi còn…; trước khi…', [1, 2, 3, 14]),
                usage('2. Thay đổi xảy ra trong lúc một việc tiếp diễn', 'Trong lúc… thì dần…', [30, 31, 33, 39])]),
    2: dict(structure='～間', meaning='Một việc hoặc trạng thái kéo dài suốt khoảng thời gian của việc khác.',
        formation='Vる／Vている／Vない + 間\nAい／Aな + 間\nN + の + 間',
        nuance='Nhấn mạnh vế sau tiếp diễn trong toàn bộ hoặc phần lớn khoảng thời gian; đối chiếu với 間に ở bài 3.',
        usages=[usage('Diễn biến liên tục trong khoảng thời gian', 'Trong suốt lúc…', [0, 2, 3, 7])]),
    3: dict(structure='～間に', meaning='Một việc xảy ra hoặc hoàn thành tại một thời điểm trong khoảng thời gian đó.',
        formation='Vる／Vている／Vない + 間に\nAい／Aな + 間に\nN + の + 間に',
        nuance='Vế sau không cần kéo dài suốt khoảng thời gian nêu ở vế trước.',
        usages=[usage('Sự việc xảy ra trong một khoảng thời gian', 'Trong lúc… thì…', [0, 2, 3, 7])]),
    4: dict(structure='Phân biệt ～間に và ～うちに', meaning='間に xác định khoảng thời gian; うちに thường nhấn mạnh tranh thủ hoặc sự thay đổi tự nhiên.',
        formation='Khoảng thời gian rõ ràng + 間に\nTrước khi trạng thái đổi + うちに',
        nuance='Có trường hợp cả hai dùng được, nhưng trọng tâm ý nghĩa khác nhau. Không thay thế máy móc trong mọi câu.',
        usages=[usage('1. 間に: khoảng thời gian có giới hạn', 'Sự việc xảy ra bên trong khoảng thời gian.', [0],
                      added=[('1時から2時の間に来てください。', 'Hãy đến trong khoảng từ 1 giờ đến 2 giờ.')]),
                usage('2. うちに: tranh thủ trước khi đổi trạng thái', 'Tranh thủ khi điều kiện còn thuận lợi.', [3, 4, 5])]),
    5: dict(structure='Phân biệt ～間 và ～間に', meaning='間 nhấn mạnh sự liên tục; 間に nhấn mạnh một việc xảy ra trong khoảng thời gian.',
        formation='N + の／Vている + 間（suốt thời gian）\nN + の／Vている + 間に（trong khoảng đó）',
        nuance='Một số câu có thể dùng cả hai, nhưng cách hiểu thời lượng của vế sau thay đổi.',
        usages=[usage('1. 間: kéo dài suốt khoảng', 'Việc thứ hai tiếp diễn trong suốt thời gian.', [0, 1, 3]),
                usage('2. 間に: xảy ra trong khoảng', 'Việc thứ hai diễn ra hoặc hoàn tất trong khoảng đó.', [5, 7, 10])]),
    6: dict(structure='～てからでないと／てからでなければ', meaning='Chỉ sau khi làm việc trước thì mới có thể làm việc sau.',
        formation='Vて + からでないと／からでなければ + kết quả không thể thực hiện',
        nuance='Vế sau thường là phủ định, diễn tả điều kiện cần; không đồng nghĩa với thứ tự đơn thuần của ～てから.',
        usages=[usage('Điều kiện cần phải hoàn tất trước', 'Nếu chưa… thì không thể…', [0, 3, 6])]),
    7: dict(structure='～ところだ／ところです', meaning='Diễn tả hành động sắp bắt đầu, đang diễn ra hoặc vừa kết thúc.',
        formation='Vる + ところだ（sắp）\nVている + ところだ（đang）\nVた + ところだ（vừa）',
        nuance='Chia thể động từ trước ところ để xác định mốc thời gian. ～たばかりだ diễn tả cảm giác “mới đây”, không nhất thiết sát thời điểm nói.',
        usages=[usage('1. Vる + ところ: sắp làm', 'Ngay trước khi bắt đầu.', [3, 5, 11]),
                usage('2. Vている + ところ: đang làm', 'Đúng lúc hành động đang tiến hành.', [16, 20, 23]),
                usage('3. Vた + ところ: vừa làm xong', 'Ngay sau khi hành động kết thúc.', [25, 27, 34]),
                usage('4. ～ところだった: suýt nữa', 'Một việc gần xảy ra nhưng cuối cùng đã không xảy ra.', [37, 40, 41])]),
    8: dict(structure='～ところに／へ／を／で', meaning='Các trợ từ đi với ところ biểu thị thời điểm xảy ra, cảnh đang bị bắt gặp hoặc mốc chuyển tiếp.',
        formation='Vる／Vている／Vた + ところに／ところへ\nVている + ところを\nVた + ところで',
        nuance='ところに／へ: đúng lúc có việc khác đến; ところを: đúng cảnh bị thấy/bắt gặp; ところで: ngay tại mốc vừa xong.',
         usages=[usage('1. ところに／へ: đúng lúc', 'Một sự việc đến vào đúng thời điểm đó.', [1, 2, 4]),
                 usage('2. ところを: bị bắt gặp', 'Một hành động đang diễn ra bị quan sát hoặc ngăn lại.', [10, 11, 12]),
                usage('3. ところで: ngay khi vừa xong', 'Sự việc khác xảy ra tại mốc vừa hoàn tất.', [15, 17, 18])]),
    9: dict(structure='～とおり／どおり', meaning='Làm hoặc diễn ra đúng như điều đã nói, nghĩ, dự tính hay hướng dẫn.',
        formation='Vる／Vた + とおり（に）\nN + の + とおり（に）\nN + どおり（に）',
        nuance='どおり gắn trực tiếp sau danh từ; とおり nối với động từ hoặc Nの.',
        usages=[usage('Đúng như mẫu hoặc dự định', 'Theo đúng…', [0, 1, 3, 6])]),
    10: dict(structure='～によって／により／による／によっては', meaning='Phương tiện; nguyên nhân; sự khác biệt theo đối tượng; tác nhân trong câu bị động.',
         formation='N／Vること + によって／により\nN + による + N\nN + によっては',
         nuance='により trang trọng, thường dùng trong văn viết. によっては chỉ một số trường hợp trong tập hợp.',
         usages=[usage('1. Phương tiện hoặc phương pháp', 'Bằng; thông qua…', [0, 2, 4, 6]),
                 usage('2. Nguyên nhân dẫn đến kết quả', 'Do; vì…', [19, 20, 22, 24]),
                 usage('3. Thay đổi tùy đối tượng', 'Tùy theo… mà khác.', [38, 39, 41, 46]),
                 usage('4. Một số trường hợp: ～によっては', 'Trong một số trường hợp thì…', [55, 58, 59]),
                 usage('5. Tác nhân của câu bị động', 'Được thực hiện bởi…', [69, 71, 75])]),
    11: dict(structure='～たびに', meaning='Mỗi lần xảy ra A thì B lại xảy ra.',
         formation='Vる + たびに\nN + の + たびに',
         nuance='Dùng cho việc lặp lại theo từng lần; không dùng đơn thuần cho thói quen liên tục không có mốc từng lần.',
         usages=[usage('Cứ mỗi lần…', 'Sự việc lặp lại tương ứng với từng lần.', [0, 1, 2, 4])]),
    12: dict(structure='～ば～ほど', meaning='Mức độ vế sau tăng hoặc giảm theo mức độ vế trước.',
         formation='Vば + Vる + ほど\nAければ + Aい + ほど\nAなら（ば） + Aな + ほど',
         nuance='Thường lặp lại cùng động từ hoặc tính từ ở hai dạng để biểu thị quan hệ “càng… càng…”.',
         usages=[usage('Càng… càng…', 'Hai mức độ biến đổi tương ứng.', [0, 1, 3, 4])]),
    13: dict(structure='～ついでに', meaning='Nhân tiện làm việc chính A thì làm thêm việc B.',
         formation='Vる／Vた + ついでに\nN + の + ついでに',
         nuance='A là mục đích hoặc dịp chính; B là việc làm thêm trong cùng cơ hội.',
         usages=[usage('Nhân tiện; tiện thể', 'Làm thêm một việc khi có dịp làm việc khác.', [0, 1, 3, 4])]),
    14: dict(structure='～ほど／ほどだ', meaning='Lấy một hình ảnh hoặc kết quả để diễn tả mức độ cao.',
         formation='Vる／Vない + ほど（だ）\nAい／Aな + ほど（だ）\nN + ほど（だ）',
         nuance='Câu ví dụ trước ほど thường là hình ảnh so sánh về mức độ, không nhất thiết là sự thật theo nghĩa đen.',
         usages=[usage('Đến mức; đến độ', 'Nhấn mạnh mức độ bằng một ví dụ cụ thể.', [0, 1, 2, 4])]),
    15: dict(structure='～くらい／ぐらい', meaning='Biểu thị mức độ, mức tối thiểu hoặc đánh giá một việc là nhỏ.',
         formation='V／A ở thể thường + くらい／ぐらい\nN + くらい／ぐらい',
         nuance='くらい và ぐらい thường thay thế được cho nhau; sắc thái cần đọc theo ngữ cảnh.',
         usages=[usage('1. Mức độ hoặc so sánh', 'Đến mức; cỡ như…', [0, 1, 3, 9]),
                 usage('2. Mức tối thiểu', 'Ít nhất; tối thiểu…', [18, 19, 21, 25]),
                 usage('3. Xem nhẹ mức độ', 'Chỉ có bấy nhiêu…', [20, 28, 29, 32])]),
    16: dict(structure='～ほど／くらい／ぐらい～はない', meaning='Theo đánh giá của người nói, không có gì bằng đối tượng được nêu.',
         formation='N + ほど／くらい／ぐらい + …はない／いない',
         nuance='Đây là nhận xét có tính chủ quan, không nhất thiết là kết luận khách quan.',
         usages=[usage('Không có gì bằng…', 'Nêu mức cao nhất theo cảm nhận.', [0, 1, 3, 7])]),
    17: dict(structure='～くらいなら／ぐらいなら', meaning='Nếu phải làm A thì người nói thà chọn B còn hơn.',
         formation='Vる + くらいなら／ぐらいなら、B のほうがいい／ましだ',
         nuance='A là phương án người nói rất không muốn chọn; B có thể cũng không lý tưởng.',
         usages=[usage('Nếu phải… thì thà…', 'Chọn B để tránh A.', [0, 1, 2, 4])]),
    18: dict(structure='～に限る', meaning='Theo ý người nói, cách đó hoặc lựa chọn đó là tốt nhất.',
         formation='N + に限る\nVる／Vない + に限る',
         nuance='Thể hiện lời khuyên hoặc đánh giá chủ quan, không phải quy tắc tuyệt đối.',
         usages=[usage('Là tốt nhất; không gì bằng', 'Chọn điều phù hợp nhất trong hoàn cảnh.', [0, 1, 2, 8])]),
    19: dict(structure='～に対して／に対する', meaning='Hướng tới một đối tượng; đặt hai điều đối lập; hoặc biểu thị tỷ lệ.',
         formation='N + に対して + mệnh đề\nN1 + に対する + N2\nSố lượng A + に対して + số lượng B',
         nuance='に対する bổ nghĩa cho danh từ theo sau; に対して đi trước mệnh đề.',
         usages=[usage('1. Đối tượng của hành động/thái độ', 'Đối với…', [0, 2, 3]),
                 usage('2. Đối lập, tương phản', 'Trong khi… thì ngược lại…', [4, 6, 8]),
                 usage('3. Tỷ lệ hoặc phân bổ', 'Cứ mỗi… thì…', [14, 15],
                       added=[('砂3に対して土1の割合で混ぜます。', 'Trộn theo tỷ lệ ba phần cát với một phần đất.')])]),
    20: dict(structure='～反面', meaning='Một sự vật có hai mặt hoặc hai đặc điểm trái chiều.',
         formation='V／Aい ở thể thường + 反面\nAな + な／である + 反面\nN + である + 反面',
         nuance='Hai vế cùng nói về một đối tượng và nêu hai mặt đối lập của nó.',
         usages=[usage('Mặt khác; ngược lại', 'Một ưu điểm đi kèm nhược điểm hoặc ngược lại.', [],
                       added=[('この薬はよく効く反面、副作用も強い。', 'Thuốc này rất hiệu quả nhưng tác dụng phụ cũng mạnh.'),
                              ('この部屋は日当たりがいい反面、夏はかなり暑い。', 'Phòng này nhiều ánh nắng nhưng mùa hè lại khá nóng.'),
                              ('化学繊維は丈夫である反面、火に弱い。', 'Sợi tổng hợp bền nhưng lại dễ bị ảnh hưởng bởi lửa.')])]),
    21: dict(structure='～一方（で）', meaning='Đặt hai việc cùng diễn ra hoặc hai mặt khác nhau cạnh nhau.',
         formation='V／Aい ở thể thường + 一方（で）\nAな／N + である + 一方（で）',
         nuance='Có thể nêu hai mặt đối lập của một việc hoặc hai việc diễn ra song song; đọc ngữ cảnh để phân biệt.',
         usages=[usage('1. Hai mặt đối lập', 'Một mặt… nhưng mặt khác…', [1, 3, 4]),
                 usage('2. Hai hoạt động song song', 'Vừa… vừa…', [0, 5, 6])]),
    22: dict(structure='～というより／というか', meaning='Sửa lại cách diễn đạt: B chính xác hơn A.',
         formation='A（thể thường／N）+ というより／というか + B',
         nuance='Không nhất thiết phủ nhận hoàn toàn A; người nói chọn B để diễn đạt sát ý hơn.',
         usages=[usage('Nói đúng hơn là…', 'B phù hợp hơn A.', [0, 1, 3, 6])]),
    23: dict(structure='～かわりに／かわりの', meaning='Thay cho; thay vì; hoặc đổi lại một lợi ích bằng điều khác.',
         formation='N + の + かわりに／かわりの + N\nVる／Vた + かわりに\nAい／Aな + かわりに',
         nuance='Nêu rõ đang thay người/vật, chọn phương án khác, hay nói về sự bù trừ.',
         usages=[usage('1. Người/vật thay thế', 'Thay cho…', [0, 1, 2]),
                 usage('2. Chọn phương án khác', 'Thay vì…', [4, 11]),
                 usage('3. Sự trao đổi hoặc bù trừ', 'Đổi lại; bù lại…', [3, 10, 13, 14, 17])]),
    24: dict(structure='～ため／ために／ためだ', meaning='Nêu nguyên nhân dẫn đến kết quả, thường dùng trong văn viết/trang trọng.',
         formation='V／Aい ở thể thường + ため（に）／ためだ\nAな + な + ため（に）／ためだ\nN + の + ため（に）／ためだ',
         nuance='Bài này nói về nguyên nhân. Vる + ために còn có cách dùng khác là mục đích; không đánh đồng hai cách dùng.',
         usages=[usage('Nguyên nhân; lý do', 'Vì… nên…', [0, 2, 3, 7])]),
    25: dict(structure='～によって／による（bị động）', meaning='Nêu người hoặc tổ chức thực hiện hành động trong câu bị động.',
         formation='N（tác nhân）+ によって + V bị động\nN1 + による + N2',
         nuance='Đặc biệt thường gặp trong văn viết khi nói về tác phẩm, phát minh hoặc sự kiện.',
         usages=[usage('Tác nhân trong câu bị động', 'Được… bởi…', [0, 2, 6, 8])]),
    26: dict(structure='～ことから／ところから', meaning='Dựa vào một sự thật để suy luận, xác định nguyên nhân hoặc đặt tên.',
         formation='V／Aい ở thể thường + ことから\nAな + な／だった + ことから\nN + だった + ことから',
         nuance='Lấy sự thật đã quan sát làm căn cứ. ところから có thể dùng với nghĩa tương tự trong một số ngữ cảnh.',
         usages=[usage('1. Căn cứ để suy luận', 'Từ dấu hiệu… suy ra…', [0, 1, 2]),
                 usage('2. Khởi điểm hoặc nguyên do', 'Từ việc… mà…', [3, 5]),
                 usage('3. Nguồn gốc tên gọi', 'Được gọi như vậy vì…', [4],
                       added=[('この町は桜が多いことから、桜町と名付けられた。', 'Thị trấn này có nhiều hoa anh đào nên được đặt tên là Sakuramachi.')])]),
    27: dict(structure='～おかげで／おかげだ／おかげか', meaning='Nhờ một nguyên nhân mà có kết quả tốt; おかげか biểu thị phỏng đoán.',
         formation='V／Aい ở thể thường + おかげで／おかげだ／おかげか\nAな + な + おかげで／おかげだ／おかげか\nN + の + おかげで／おかげだ／おかげか',
         nuance='おかげで đi trước kết quả; おかげだ kết câu; おかげか nói nguyên nhân chưa chắc chắn.',
         usages=[usage('1. おかげで: nhờ… nên…', 'Nguyên nhân tạo kết quả tích cực.', [0, 2, 3]),
                 usage('2. おかげだ: chính là nhờ…', 'Nêu nguyên nhân ở cuối câu.', [1],
                       added=[('合格できたのは先生のおかげだ。', 'Tôi thi đỗ được là nhờ thầy cô.')]),
                 usage('3. おかげか: có lẽ nhờ…', 'Phỏng đoán nguyên nhân tích cực.', [],
                       added=[('早く寝たおかげか、今日は体調がいい。', 'Có lẽ nhờ ngủ sớm nên hôm nay tôi thấy khỏe.'),
                              ('運動を始めたおかげか、疲れにくくなった。', 'Có lẽ nhờ bắt đầu tập thể dục nên tôi đỡ mệt hơn.')])]),
    28: dict(structure='～せいで／せいだ／せいか／せいにする', meaning='Quy một kết quả xấu cho nguyên nhân; phỏng đoán hoặc đổ lỗi.',
         formation='V／Aい ở thể thường + せいで／せいだ／せいか\nAな + な + せいで／せいだ／せいか\nN + の + せいで／せいだ／せいか\nN + のせいにする',
         nuance='せい thường nêu kết quả không mong muốn; trong một số câu せいか có thể nêu kết quả tốt với sắc thái đùa hoặc bất ngờ.',
         usages=[usage('1. せいで: tại… nên…', 'Nguyên nhân của kết quả không mong muốn.', [0, 1, 2]),
                 usage('2. せいだ: là do…', 'Đặt nguyên nhân ở cuối câu.', [10, 12, 15]),
                 usage('3. せいか: không biết có phải do…', 'Phỏng đoán nguyên nhân.', [17, 21, 24]),
                 usage('4. せいにする: đổ lỗi', 'Quy trách nhiệm cho người/vật khác.', [26, 27, 28])]),
    29: dict(structure='～のだから', meaning='Vì một sự thật đã rõ hoặc người nghe cũng biết nên đưa ra nhận xét, lời khuyên.',
         formation='V／Aい ở thể thường + のだから\nAな／N + な + のだから',
         nuance='Trong văn nói thường rút thành ～んだから. Vế sau hay là lời khuyên, phán đoán hoặc yêu cầu.',
         usages=[usage('Vì đã… nên…', 'Lấy điều đã rõ làm căn cứ.', [0, 1, 2])]),
    30: dict(structure='～なら／のなら', meaning='Nêu điều kiện từ thông tin đã biết, rồi đưa ra ý kiến hoặc hành động.',
         formation='V／Aい ở thể thường + なら／のなら\nAな／N + なら',
         nuance='N và Aな thường nối trực tiếp với なら; khi dùng のなら cần dạng danh từ hóa phù hợp. Phần sau thường là lời khuyên, đề nghị hoặc phán đoán.',
         usages=[usage('1. ～なら: nếu là vậy thì…', 'Phản ứng với điều kiện hoặc thông tin được nêu.', [0, 1, 3, 4]),
                 usage('2. ～のなら: nếu thực sự…', 'Nhấn mạnh điều kiện đã được xác nhận.', [7, 11, 12, 16])]),
}

# Corrections to examples copied from the source. The generated editorial
# examples above are deliberately marked separately in the output.
EXAMPLE_FIXES = {
    (1, 30): ('難しい本を読んでいるうちに、眠くなりました。', 'Trong khi đọc cuốn sách khó, tôi dần buồn ngủ.'),
    (1, 33): ('彼女の話を聞いているうちに、涙が出てきました。', 'Nghe cô ấy kể chuyện một lúc, tôi đã rơi nước mắt.'),
    (2, 2): ('昨日は、家にいる間、ずっと本を読んでいました。', 'Hôm qua, tôi đọc sách suốt thời gian ở nhà.'),
    (2, 0): ('お母さんが昼寝をしている間、子供たちはテレビを見ていた。', 'Bọn trẻ xem ti vi suốt lúc mẹ ngủ trưa.'),
    (4, 0): ('この新聞は電車を待っている間に買った。', 'Tôi mua tờ báo này trong lúc đợi tàu.'),
    (4, 3): ('若いうちに勉強しておきなさい。', 'Hãy tranh thủ học khi còn trẻ.'),
    (4, 4): ('熱いうちに早く食べましょう。', 'Hãy ăn ngay khi món ăn còn nóng.'),
    (4, 5): ('雨が降らないうちに帰りましょう。', 'Hãy về trước khi trời mưa.'),
    (7, 25): ('たった今バスが出たところです。', 'Xe buýt vừa rời đi.'),
    (7, 23): ('今ご飯を作っているところです。', 'Bây giờ tôi đang nấu cơm.'),
    (7, 41): ('道を歩いていたら、急に車が来て、死ぬところだった。', 'Đang đi bộ thì xe bất ngờ lao tới; tôi suýt mất mạng.'),
    (8, 12): ('指揮者の物まねをしているところを妹に見られてしまった。', 'Tôi bị em gái nhìn thấy lúc đang bắt chước nhạc trưởng.'),
    (8, 11): ('授業中に居眠りしているところを先生に見つかってしまった。', 'Tôi bị thầy giáo phát hiện ngủ gật trong giờ học.'),
    (10, 0): ('インターネットによって、レストランやホテルを予約することができます。', 'Có thể đặt nhà hàng và khách sạn qua Internet.'),
    (10, 2): ('習った言葉をすぐ使ってみることによって、その言葉を覚えられます。', 'Dùng ngay từ vừa học giúp tôi nhớ từ đó.'),
    (10, 4): ('バスによる移動は便利だが、時間がかかる。', 'Đi bằng xe buýt thuận tiện nhưng mất thời gian.'),
    (11, 0): ('コンビニへ行くたびに、つい買いすぎてしまう。', 'Cứ mỗi lần vào cửa hàng tiện lợi là tôi lại lỡ mua quá nhiều.'),
    (14, 4): ('今、家の近くで工事をしていて、集中できないほどうるさいです。', 'Gần nhà đang thi công, ồn đến mức tôi không thể tập trung.'),
    (15, 21): ('せめてチョコくらいは買ってくれ。', 'Ít nhất hãy mua giúp tôi ít sô cô la.'),
    (19, 6): ('あの二人は双子なのに、兄はおとなしいのに対して、弟はよくしゃべる。', 'Dù là sinh đôi, người anh ít nói còn người em nói rất nhiều.'),
    (19, 3): ('お客様に対して、失礼なことを言ってはいけません。', 'Không được nói lời thất lễ với khách hàng.'),
    (24, 3): ('ただ今、品川駅で人身事故が起こったため、電車が止まっております。', 'Hiện tàu đang dừng vì đã xảy ra tai nạn liên quan đến người tại ga Shinagawa.'),
    (25, 2): ('このドレスは有名なデザイナーによってデザインされました。', 'Chiếc váy này được một nhà thiết kế nổi tiếng thiết kế.'),
    (27, 0): ('奨学金をもらったおかげで、留学できた。', 'Nhờ nhận học bổng mà tôi có thể đi du học.'),
    (28, 0): ('バスが遅れたせいで、約束の時間に間に合わなかった。', 'Do xe buýt đến muộn, tôi không kịp giờ hẹn.'),
    (28, 28): ('他人のせいにするのは、自らの弱さを露呈しているようなものです。', 'Đổ lỗi cho người khác chẳng khác nào bộc lộ sự yếu đuối của chính mình.'),
    (29, 1): ('あなたはけがをしているんだから、無理をしてはいけませんよ。', 'Vì bạn đang bị thương nên đừng cố quá sức.'),
}
STRUCTURE_RUBY = {
    2: '～{間|あいだ}',
    3: '～{間|あいだ}に',
    20: '～{反面|はんめん}',
    21: '～{一方|いっぽう}（で）',
}
EDITORIAL_RUBY = {
    'この薬はよく効く反面、副作用も強い。': 'この{薬|くすり}はよく{効|き}く{反面|はんめん}、{副作用|ふくさよう}も{強|つよ}い。',
    'この部屋は日当たりがいい反面、夏はかなり暑い。': 'この{部屋|へや}は{日当|ひあ}たりがいい{反面|はんめん}、{夏|なつ}はかなり{暑|あつ}い。',
    '化学繊維は丈夫である反面、火に弱い。': '{化学繊維|かがくせんい}は{丈夫|じょうぶ}である{反面|はんめん}、{火|ひ}に{弱|よわ}い。',
}


def make_example(example, editorial=False):
    result = {key: example[key].strip() for key in ('jpn', 'vie')}
    if example.get('ruby') and not editorial:
        result['ruby'] = example['ruby']
    elif result['jpn'] in EDITORIAL_RUBY:
        result['ruby'] = EDITORIAL_RUBY[result['jpn']]
    if editorial:
        result['editorial'] = True
    return result


def build():
    source = {item['id']: item for item in json.loads(SOURCE.read_text(encoding='utf-8'))['items']}
    result = []
    for number in range(1, 31):
        item_id = f'tndg-{number:03}'
        spec = LESSONS[number]
        corpus = source[item_id]['examples']
        blocks = []
        all_examples = []
        seen = set()
        for block_number, part in enumerate(spec['usages'], 1):
            examples = []
            for index in part['indexes']:
                correction = EXAMPLE_FIXES.get((number, index))
                example = make_example({'jpn': correction[0], 'vie': correction[1]} if correction else corpus[index],
                                       editorial=bool(correction))
                if example['jpn'] not in {e['jpn'] for e in examples}:
                    examples.append(example)
            for jpn, vie in part['added']:
                examples.append(make_example({'jpn': jpn, 'vie': vie}, editorial=True))
            if not examples:
                raise ValueError(f'{item_id} block {block_number} has no examples')
            for example in examples:
                if example['jpn'] not in seen:
                    seen.add(example['jpn'])
                    all_examples.append(example)
            blocks.append(dict(blockNumber=block_number, heading=part['heading'],
                               meaning=part['meaning'], formation=part['formation'],
                               nuance=part['nuance'], examples=examples))
        result.append(dict(id=item_id, structure=spec['structure'],
                           **({'structureRuby': STRUCTURE_RUBY[number]} if number in STRUCTURE_RUBY else {}),
                           meaning=spec['meaning'],
                           formation=spec['formation'], nuance=spec['nuance'],
                           blocks=blocks, examples=all_examples,
                           totalExamplesCount=len(all_examples)))
    OUTPUT.write_text(json.dumps({'schemaVersion': 1, 'items': result}, ensure_ascii=False,
                                 indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(result)} lessons, {sum(len(x["blocks"]) for x in result)} usages, '
          f'{sum(len(x["examples"]) for x in result)} selected examples')


if __name__ == '__main__':
    build()
